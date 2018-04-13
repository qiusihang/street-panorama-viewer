var AMSPano = {

    createNew: function(panorama, init_params = {pos:{lat: 52.376937, lng: 4.901927},zoom:2.0,pov:{heading:90,pitch:0}} )
    {

        var proxy_head = "https://calm-hamlet-41397.herokuapp.com/geturl.php?";
        var request_head = "https://api.data.amsterdam.nl/panorama/opnamelocatie/";
        var heading = 0; // it's the default heading of panorama, not current heading
        var zoom = init_params.zoom;
        var curPos = init_params.pos;
        var pov = init_params.pov;
        var markers = [];
        var adjacents = [];
        var imgurl = "";
        var images = document.createElement("ul");
        var image1 = document.createElement("li");
        var image2 = document.createElement("li");
        var operation = document.createElement("div");
        var zoominout = document.createElement("div");
        var zoomin = document.createElement("input");
        var zoomout = document.createElement("input");
        var compass = document.createElement("div");
        var compass_circle = document.createElement("div");
        var compass_triangle_red = document.createElement("div");
        var compass_triangle_white = document.createElement("div");

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
                    imgurl = request["image_sets"]["equirectangular"]["medium"];
                    heading = request["heading"];
                    adjacents = request["adjacent"];
                    curPos.lat = request["geometrie"]["coordinates"][1];
                    curPos.lng = request["geometrie"]["coordinates"][0];

                    //console.log("Get panorama: "+imgurl);
                    image1.innerHTML = "<img src=\""+imgurl+"\" height=\"100%\"/>";
                    image2.innerHTML = "<img src=\""+imgurl+"\" height=\"100%\"/>";
                },
                error:function(e){
                    console.log(this.url);
                    panorama.innerHTML = "<br/><br/><br/><br/>loading failed"
                    image1.innerHTML = "<img height=\"100%\"/>";
                    image2.innerHTML = "<img height=\"100%\"/>";
                }
            });
        };

        panorama.set_zoom = function(z)
        {
            zoom = z;
            panorama.update_zoom();
        }

        panorama.get_zoom = function()
        {
            return zoom;
        }

        panorama.set_location = function(pos)
        {
            panorama.set_loading();
            curPos.lat = pos.lat;
            curPos.lng = pos.lng;
            panorama.set();
        }

        panorama.get_location = function()
        {
            return {lat:curPos.lat,lng:curPos.lng};
        }

        panorama.update_zoom = function()
        {
            image1.style.width = zoom * 3.0 * panorama.clientHeight;
            image1.style.height = zoom * 1.5 * panorama.clientHeight;
            image1.style.left = 0;
            image1.style.top = 0;
            image2.style.width = image1.style.width;
            image2.style.height = image1.style.height;
            image2.style.left = parseInt(image1.style.left)+parseInt(image1.style.width);
            image2.style.top = image1.style.top;
        }

        panorama.get_center = function()
        {
            var cx = panorama.clientWidth/2 - parseInt(image1.style.left);
            var cy = panorama.clientHeight/2 - parseInt(image1.style.top);
            return {
                width_percentage:cx/2.0/parseInt(image1.style.width),
                height_percentage:cy/parseInt(image1.style.height)
            };
        }

        panorama.set_center = function(center)
        {
            var wp = center["width_percentage"];
            var hp = center["height_percentage"];
            var cx = 2*parseInt(image1.style.width)*wp;
            var cy = parseInt(image1.style.height)*hp;
            image1.style.left = panorama.clientWidth/2 - cx;
            image1.style.top = panorama.clientHeight/2 - cy;
            image2.style.left = parseInt(image1.style.left)+parseInt(image1.style.width)-1;
            image2.style.top = image1.style.top;
            panorama.update_compass();
        }

        panorama.set_pov = function(pov)
        {
            panorama.set_center({width_percentage:pov.heading/720.0,height_percentage:pov.pitch+0.5});
        }

        panorama.get_pov = function()
        {
            var p = panorama.get_center();
            var h = p.width_percentage * 720.0;
            h = parseInt(h % 360);
            return {heading:h, pitch:p.height_percentage-0.5};
        }

        panorama.set_loading = function()
        {
            image1.innerHTML = "<img height=\"100%\"/>";
            image2.innerHTML = "<img height=\"100%\"/>";
        }

        panorama.update_compass = function()
        {
            var p = panorama.get_center();
            var h = p.width_percentage* 720.0 + 180;
            h = parseInt(h % 360);
            compass.style.transform = "rotate("+(360-h)+"deg)";
        }

        panorama.correct = function()
        {
            if (parseInt(image1.style.left) > 0) // exceed the left bound
            {
                image2.style.left = image1.style.left;
                image1.style.left = parseInt(image1.style.left) - parseInt(image1.style.width);
            }
            if (parseInt(image2.style.left)+parseInt(image1.style.width) < panorama.clientWidth ) // exceed the right bound
            {
                image1.style.left = image2.style.left;
                image2.style.left = parseInt(image2.style.left) + parseInt(image1.style.width);
            }
            panorama.update_compass();
        }

        operation.onmousedown = function(ev) //mouse down
        {
            var ev = ev || window.event;
            var sx = ev.clientX;
            var sy = ev.clientY;
            var i1l = parseInt(image1.style.left);
            var i2l = parseInt(image2.style.left);
            var it = parseInt(image1.style.top);
            document.onmousemove = function(ev) //mouse move: move panorama
            {
                var ev = ev || window.event;
                var nx = ev.clientX;
                var ny = ev.clientY;
                image1.style.left = i1l + nx - sx;
                image2.style.left = i2l + nx - sx;
                if ( it + ny - sy <= 0 && it + parseInt(image1.style.height) + ny - sy >= panorama.clientHeight ) // exceed the top or bottom bound
                {
                    image1.style.top = it + ny - sy;
                    image2.style.top = it + ny - sy;
                }
                panorama.correct();
            };
            operation.onmouseup = function(ev)
            {
                document.onmousemove = null;
                operation.onmouseup = null;
            };
        };

        operation.ondblclick = function(ev)
        {
            var h = (ev.clientX - parseInt(image1.style.left))/(2*parseInt(image1.style.width)) * 720.0;
            h = parseInt(h % 360);
            var m = 0, index=-1;
            //console.log(h);
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
                panorama.set_loading();
                panorama.set(adjacents[index]["pano_id"]);
            }
        }

        zoomin.onclick = function() {
            if ( zoom < 4.0) zoom += 0.2;
            var p = panorama.get_center();
            panorama.update_zoom();
            panorama.set_center(p);
        };

        zoomout.onclick = function()
        {
            if ( zoom > 1.0 ) zoom -= 0.2;
            var p = panorama.get_center();
            panorama.update_zoom();
            panorama.set_center(p);
        };

        // CSS style
        panorama.style.backgroundColor = "#646464";
        panorama.style.overflow = "hidden";
        panorama.style.color = "#fff";
        panorama.style.textAlign = "center";
        panorama.style.fontFamily = "Arial";
        panorama.style.fontSize = "20px";
        panorama.innerHTML="<br/><br/><br/><br/>loading panorama...";

        images.style.position = "absolute";
        images.style.left = "0";
        images.style.top = "0";
        image1.style.position = "absolute";
        image1.style.listStyle = "none";
        image2.style.position = "absolute";
        image2.style.listStyle = "none";

        operation.style.position = "absolute";
        operation.style.top = "0%";
        operation.style.left = "0%";
        operation.style.height = "100%";
        operation.style.width = "100%";
        operation.style.opacity = "0";
        operation.style.zIndex = "9";
        operation.style.overflow = "hidden";

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

        panorama.appendChild(images);
            images.appendChild(image1);
            images.appendChild(image2);
        panorama.appendChild(operation);
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
