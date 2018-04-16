var AMSPano = {

    createNew: function(panorama, init_params = {pos:{lat: 52.376937, lng: 4.901927},zoom:1.0,pov:{heading:90,pitch:0}} )
    {

        var proxy_head = "https://calm-hamlet-41397.herokuapp.com/geturl.php?";
        var proxy_img_head = "https://calm-hamlet-41397.herokuapp.com/getimg.php?";
        var request_head = "https://api.data.amsterdam.nl/panorama/opnamelocatie/";
        var heading = 0; // it's the default heading of panorama, not current heading
        var zoom = init_params.zoom;
        var curPos = init_params.pos;
        var pov = init_params.pov;
        var markers = [];
        var adjacents = [];
        var imgurl_small = "";
        var imgurl_medium = "";
        var imgurl_full = "";
        var zoominout = document.createElement("div");
        var zoomin = document.createElement("input");
        var zoomout = document.createElement("input");
        var compass = document.createElement("div");
        var compass_circle = document.createElement("div");
        var compass_triangle_red = document.createElement("div");
        var compass_triangle_white = document.createElement("div");

        //3D
        var first_draw = true;
        var threeDview = document.createElement("div");
        var renderer;
        var camera;
        var scene;
        var controls;
        var composer;
        var effectBlend;
        var ambientLight, spotLight;
        var mesh,loader=new THREE.TextureLoader();

        function initRender() {
            renderer = new THREE.WebGLRenderer({antialias: true});
            renderer.setSize(panorama.clientWidth, panorama.clientHeight);
            renderer.shadowMap.enabled = true;
            threeDview.appendChild(renderer.domElement);
        }

        function initComposer()
        {
            // POSTPROCESSING
            renderer.autoClear = false;
			var renderTargetParameters = {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBFormat,
				stencilBuffer: true
			};
			var renderTarget = new THREE.WebGLRenderTarget( panorama.clientWidth, panorama.clientHeight, renderTargetParameters );
			var effectSave = new THREE.SavePass( new THREE.WebGLRenderTarget( panorama.clientWidth, panorama.clientHeight, renderTargetParameters ) );
            effectSave.clear = false;
            effectBlend = new THREE.ShaderPass( THREE.BlendShader, "tDiffuse1" );
			var effectVignette = new THREE.ShaderPass( THREE.VignetteShader );

            // motion blur
            effectBlend.uniforms[ 'tDiffuse2' ].value = effectSave.renderTarget.texture;
			effectBlend.uniforms[ 'mixRatio' ].value = 0;
			var renderModel = new THREE.RenderPass( scene, camera );
			effectVignette.renderToScreen = true;
			composer = new THREE.EffectComposer( renderer, renderTarget );
			composer.addPass( renderModel );
            composer.addPass( effectBlend );
            composer.addPass( effectSave );
			composer.addPass( effectVignette );
        }

        function initCamera() {
            var fov = 180/Math.pow(2,zoom);
            camera = new THREE.PerspectiveCamera(fov, panorama.clientWidth / panorama.clientHeight, 1, 10000);
            scene.add(camera);
        }

        function initScene() {
            scene = new THREE.Scene();
        }

        function initModel() {
            var geometry = new THREE.SphereBufferGeometry( 500, 60, 40 );
            geometry.scale( - 1, 1, 1 );
            // first, load small panorama
            var texture_small, texture_full;
            texture_small = new THREE.MeshBasicMaterial( {
                map: new THREE.TextureLoader().load(imgurl_small, void function(){}() )
            });
            texture_small.map.minFilter = THREE.LinearFilter;
            mesh = new THREE.Mesh( geometry, texture_small );

            // then, load full panorama
            new THREE.TextureLoader().load(imgurl_full, function (texture) {
                texture_full = new THREE.MeshBasicMaterial( {
                    map: texture
                } );
                mesh.material = texture_full;
                texture_full.map.minFilter = THREE.LinearFilter;
            });
            scene.add( mesh );
        }

        function initControls() {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            panorama.update_pov();
            controls.enableDamping = true;
            controls.autoRotate = false;
            controls.minDistance = 20;
            controls.maxDistance = 10000;
            controls.rotateSpeed = -0.2;
            controls.enableZoom = false;
        }

        function onWindowResize() {
            camera.aspect = panorama.clientWidth / panorama.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(panorama.clientWidth, panorama.clientHeight);
            composer.setSize(panorama.clientWidth, panorama.clientHeight);
        }

        var transition_time = 0;
        function transition()
        {
            if ( transition_time > 0 ) {
                transition_time ++;
                var fov = 180/Math.pow(2,zoom);
                if ( transition_time % 2 == 0 ) fov = 180/Math.pow(2,zoom + Math.log(transition_time)*0.1);
                if ( camera!=null )
                {
                    camera.fov = fov;
                    camera.updateProjectionMatrix();
                }
            }else transition_time = 0;
        }

        function render() {
            //renderer.render(scene, camera);
            renderer.autoClear = false;
        	renderer.setRenderTarget( null );
            renderer.clear();
            composer.render( 0.1 );
        }

        function animate() {
            requestAnimationFrame(animate);
            render();
            controls.update();
            transition();
        }

        function draw() {
            initScene();
            initCamera();
            initRender();
            initComposer();
            initModel();
            initControls();
            animate();
            window.onresize = onWindowResize;
        }

        panorama.set = function(pano_id="")
        {
            var req = "";
            if ( pano_id!="" )
            {
                req = proxy_head + request_head + pano_id + "/?format=json";
            }else{
                req = proxy_head + request_head + "?format=json&lat=" + curPos.lat + "&lon=" + curPos.lng;
            }
            //console.log("Request sent: "+req);
            jQuery.ajax({
                dataType:"JSONP",
                jsonp: "callback",
                url:req,
                success:function(request){
                    imgurl_small = proxy_img_head + request["image_sets"]["equirectangular"]["small"];
                    imgurl_medium = proxy_img_head + request["image_sets"]["equirectangular"]["medium"];
                    imgurl_full = proxy_img_head + request["image_sets"]["equirectangular"]["full"];
                    heading = request["heading"];
                    adjacents = request["adjacent"];
                    curPos.lat = request["geometrie"]["coordinates"][1];
                    curPos.lng = request["geometrie"]["coordinates"][0];
                    var oldLogFunction = console.log;
                    console.log = function(){};//reset console.log
                    if ( first_draw ) { draw(); first_draw = false; }
                    else{
                        var texture_small, texture_full;
                        new THREE.TextureLoader().load(imgurl_small, function (texture) {
                            texture_small = new THREE.MeshBasicMaterial( {
                                map: texture
                            } );
                            texture_small.map.minFilter = THREE.LinearFilter;
                            mesh.material = texture_small;
                            panorama.update_zoom();
                            effectBlend.uniforms[ 'mixRatio' ].value = 0;
                            transition_time = 0;
                        });
                        new THREE.TextureLoader().load(imgurl_full, function (texture) {
                            texture_full = new THREE.MeshBasicMaterial( {
                                map: texture
                            } );
                            texture_full.map.minFilter = THREE.LinearFilter;
                            mesh.material = texture_full;
                            //panorama.update_zoom();
                        });
                    }
                    console.log = oldLogFunction; // reset console.log
                },
                error:function(e){
                    console.log(this.url);
                    while (threeDview.lastChild) {
                        threeDview.removeChild(threeDview.lastChild);
                    }
                }
            });
        };

        panorama.set_zoom = function(z)
        {
            if ( 0.5 < z && z < 3.0 )
                zoom = z;
            panorama.update_zoom();
        }

        panorama.get_zoom = function()
        {
            return zoom;
        }

        panorama.update_zoom = function()
        {
            var fov = (180/Math.pow(2,zoom));
            if ( camera!=null )
            {
                camera.fov = fov;
                camera.updateProjectionMatrix();
            }
        }

        panorama.set_location = function(pos)
        {
            curPos.lat = pos.lat;
            curPos.lng = pos.lng;
            panorama.set();
        }

        panorama.get_location = function()
        {
            return {lat:curPos.lat,lng:curPos.lng};
        }

        panorama.set_pov = function(p)
        {
            pov = {heading:p.heading, pitch:p.pitch};
            panorama.update_pov();
        }

        panorama.get_pov = function()
        {
            if ( controls != null )
            {
                h = (controls.getAzimuthalAngle() * 180.0 / Math.PI + 270)%360;
                p = controls.getPolarAngle() * 180.0 / Math.PI - 90;
                return {heading:h, pitch:p};
            }
            return null;
        }

        panorama.update_pov = function()
        {
            var h = (180-pov.heading)/180.0*Math.PI;
            var p = (pov.pitch-90)/180.0*Math.PI;
            if ( controls!=null ) controls.target.set(Math.cos(h),Math.cos(p),Math.sin(h));
        }

        panorama.update_compass = function(heading)
        {
            compass.style.transform = "rotate("+heading+"deg)";
        }

        var is_drag = false;
        var timmer_handle = null;
        threeDview.onmousedown = function()
        {
            is_drag = false;
            effectBlend.uniforms[ 'mixRatio' ].value = 0;
            threeDview.style.cursor = "move";
            timmerHandle = setTimeout(function(){is_drag=true;},100); // interval(mousedown, mouseup)>100ms: drag
        }
        threeDview.onmousemove = function()
        {
            if ( controls != null )
            {
                pov = panorama.get_pov();
                panorama.update_compass(pov.heading);
            }
        }
        threeDview.onmouseup = function(ev)
        {
            threeDview.style.cursor = "pointer";
            if ( is_drag ) { is_drag = false; return; }
            if ( controls == null ) return;
            var fov = 180/Math.pow(2,zoom);
            var bias = (ev.clientX - panorama.clientWidth/2)/panorama.clientWidth*fov; // if mouse doesn't click on the center
            var h = (180-(pov.heading-bias)+360)%360;
            var m = 0, index=-1;
            // find adjacents according to json file
            for ( var i = 0 ; i < adjacents.length ; i ++ )
            {
                var dir = (heading+parseInt(adjacents[i]["direction"])+180)%360;
                var dis = parseInt(adjacents[i]["distance"]);
                if ( dis > 5 && Math.abs(dir-h) < 30 && m < parseInt(adjacents[i]["year"]) )
                {
                    m = parseInt(adjacents[i]["year"]);
                    index = i;
                }
            }
            if ( index > -1 )
            {
                transition_time = 1;
                effectBlend.uniforms[ 'mixRatio' ].value = 0.95;
                panorama.set(adjacents[index]["pano_id"]);
            }
        }

        zoomin.onclick = function() {
            if ( zoom < 3.0) zoom += 0.2;
            panorama.update_zoom();
        };

        zoomout.onclick = function()
        {
            if ( zoom > 0.5 ) zoom -= 0.2;
            panorama.update_zoom();
        };

        // CSS style
        panorama.style.backgroundColor = "#646464";
        panorama.style.overflow = "hidden";
        panorama.style.color = "#fff";
        panorama.style.textAlign = "center";
        panorama.style.fontFamily = "Arial";
        panorama.style.fontSize = "20px";
        panorama.innerHTML="<br/><br/><br/><br/>loading panorama...";

        threeDview.style.position = "absolute";
        threeDview.style.left = "0%";
        threeDview.style.top = "0%";
        threeDview.style.height = "100%";
        threeDview.style.width = "100%";
        threeDview.style.cursor = "pointer";

        zoominout.style.position = "absolute";
        zoominout.style.bottom = "20px";
        zoominout.style.right = "20px";
        zoominout.style.zIndex = "10";
        zoominout.style.textAlign = "center";

        zoomin.style.backgroundColor = "black";
        zoomin.style.color = "white";
        zoomin.style.fontSize = "16px";
        zoomin.style.border = "0";
        zoomin.style.opacity = "0.6";
        zoomin.type = "button";
        zoomin.value = "+";

        zoomout.style.backgroundColor = "black";
        zoomout.style.color = "white";
        zoomout.style.fontSize = "16px";
        zoomout.style.border = "0";
        zoomout.style.opacity = "0.6";
        zoomout.type = "button";
        zoomout.value = "-";

        compass.style.position = "relative";
        compass.style.transform = "rotate(0deg)";
        compass.style.width = "50px";
        compass.style.height = "50px";
        compass.style.top = "5px";

        compass_circle.style.position = "absolute";
        compass_circle.style.left = "0%";
        compass_circle.style.top = "0%";
        compass_circle.style.width = "50px";
        compass_circle.style.height = "50px";
        compass_circle.style.background = "black";
        compass_circle.style.borderRadius = "25px";
        compass_circle.style.opacity = "0.6";

        compass_triangle_red.style.position = "absolute";
        compass_triangle_red.style.left = "20px";
        compass_triangle_red.style.top = "7px";
        compass_triangle_red.style.width = "0";
        compass_triangle_red.style.height = "0";
        compass_triangle_red.style.borderLeft = "5px solid transparent";
        compass_triangle_red.style.borderRight = "5px solid transparent";
        compass_triangle_red.style.borderBottom = "18px solid red";
        compass_triangle_red.style.opacity = "0.8";

        compass_triangle_white.style.position = "absolute";
        compass_triangle_white.style.left = "20px";
        compass_triangle_white.style.top = "25px";
        compass_triangle_white.style.width = "0";
        compass_triangle_white.style.height = "0";
        compass_triangle_white.style.borderLeft = "5px solid transparent";
        compass_triangle_white.style.borderRight = "5px solid transparent";
        compass_triangle_white.style.borderTop = "18px solid white";
        compass_triangle_white.style.opacity = "0.8";

        panorama.appendChild(threeDview);
        panorama.appendChild(zoominout);
            zoominout.appendChild(zoomin);
            zoominout.appendChild(zoomout);
            zoominout.appendChild(compass);
                compass.appendChild(compass_circle);
                compass.appendChild(compass_triangle_red);
                compass.appendChild(compass_triangle_white);

        // initialize
        panorama.set_location(curPos);
        panorama.set_zoom(zoom);
        panorama.set_pov(pov);

        return panorama;
    }
}
