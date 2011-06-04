//
//  soles.js
//
//  A graph visualization using arbor.js.
//
//     This program is free software; you can redistribute it and/or
//     modify it under the terms of the GNU Lesser General Public
//     License as published by the Free Software Foundation; either
//     version 2.1 of the License, or (at your option) any later version.
// 
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
//     Lesser General Public License for more details.
// 
//     You can receive a copy of the GNU Lesser General Public License from 
//     http://www.gnu.org/
//
//  This program contains code and uses the library arbor.js, by
//  Samizdat Drafting Co., a graph visualization library using web workers
//  and jQuery, released under the Arbor is released under the MIT license:
//  http://en.wikipedia.org/wiki/MIT_License

(function($){
  var Renderer = function(elt){
    var dom = $(elt)
    var canvas = dom.get(0)
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas)
    var sys = null
    
    var selected = null,
        nearest = null,
        _mouseP = null;

    var that = {
      init:function(system){
        //
        // the particle system [sys] will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        sys = system

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        sys.screenSize(canvas.width, canvas.height) 
        sys.screenPadding(80) // leave an extra 80px of whitespace per side
        $(window).resize(that.resize)
        that.resize()
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },
 
      resize:function(){
        canvas.width = $(window).width()
        canvas.height = $(window).height()
        sys.screen({size:{width:canvas.width, height:canvas.height}})
        that.redraw()
      },
      
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        var title = "Grupos de Trabajo #AcampadaSol"
        ctx.font = "bold 20px Arial"
        ctx.textAlign = "left"
        ctx.fillStyle = "#151515"
        ctx.fillText(title||"", 20, 20)
        
        sys.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords
          // draw a line from pt1 to pt2
          if (edge.source.data.alpha * edge.target.data.alpha == 0) return
          ctx.strokeStyle = "rgba(0,0,0, .333)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
          ctx.stroke()
        })

        sys.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords
          if (node.data.alpha===0) return
          // draw an ellipse centered at pt
          var w = node.data.radius ? node.data.radius : 60

          var label = node.name
          var text_color = node.data.link ? "#3133C0" : "#3C3C3C"
        
          if (node.data.shape=='dot'){
            gfx.oval(pt.x-w/2, pt.y-w/2, w, w, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(label, pt.x, pt.y+7, {alpha:node.data.alpha, color:text_color, align:"center", font:"Arial", size:13})
            gfx.text(label, pt.x, pt.y+7, {alpha:node.data.alpha, color:text_color, align:"center", font:"Arial", size:13})
          }else{
            var w = Math.max(20, 20+gfx.textWidth(label) )
            gfx.rect(pt.x-w/2, pt.y-8, w, 20, 4, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(label, pt.x, pt.y+9, {alpha:node.data.alpha, color:text_color, align:"center", font:"Arial", size:12})
            gfx.text(label, pt.x, pt.y+9, {alpha:node.data.alpha, color:text_color, align:"center", font:"Arial", size:12})
          }
        })

      },
      
      switchSection:function(newSection){
        // Max alpha for leaf nodes.
        var transp = 0.7
        var duration = 0.5
        if (!sys.getEdgesFrom(newSection)[0]) {
          newSection = "#AcampadaSol"
        }
          
        var parent = sys.getEdgesFrom(newSection)[0].source
        var children = $.map(sys.getEdgesFrom(newSection), function(edge){
          return edge.target
        })
        
        sys.eachNode(function(node){
          
          if (node.data.shape=='dot') {
            if ( node.name !=newSection && node.name != "#AcampadaSol" ) {
              if ( newSection == "#AcampadaSol" ) {
                sys.tweenNode(node, duration, {alpha: 1})
              } else {              
                sys.tweenNode(node, duration, {alpha:.2})
              }
            } else {
              sys.tweenNode(node, duration, {alpha:1})
            }
            return // skip all but leafnodes
          }
          
          var nowVisible = ($.inArray(node, children)>=0)
          var newAlpha = (nowVisible) ? transp : 0
          var dt = (nowVisible) ? duration : duration
          sys.tweenNode(node, dt, {alpha:newAlpha})

          if (newAlpha==transp){
            node.p.x = parent.p.x + .05*Math.random() - .025
            node.p.y = parent.p.y + .05*Math.random() - .025
            node.tempMass = .001
          }
        })
      },
 
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;
        var selected = null;
        var nearest = null;
        var oldmass = 1

        var _section = null

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          moved:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = sys.nearest(_mouseP);
            
            if (!nearest.node) return false
            
            selected = (nearest.distance < 50) ? nearest : null

            if (nearest.node.data.shape=='dot') {
              //selected = null
              if (nearest.node.name!=_section){
                _section = nearest.node.name
                that.switchSection(_section)
              }
            }
            return false
          },
 
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = sys.nearest(_mouseP);
            // while we're dragging, don't let physics move the node
            if (dragged && dragged.node !== null) dragged.node.fixed = true
            $(canvas).unbind('mousemove', handler.moved);
            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
 
          dragged:function(e){
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (!nearest) return
            if (dragged.data && dragged.alpha == 0) {
              return
            }
            if (dragged && dragged.node !== null){
              var p = sys.fromScreen(s)
              dragged.node.p = p
            }
            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            $(canvas).bind('mousemove', handler.moved);
            _mouseP = null
            return false
          },
          
          dblclick:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = sys.nearest(_mouseP);

            if (nearest && selected && nearest.node==selected.node){
              var link = selected.node.data.link
              if (link) {
                window.open(link);
              }
            }
          },
        }
        // start listening
        $(canvas).mousedown(handler.clicked);
        $(canvas).mousemove(handler.moved);
        $(canvas).dblclick(handler.dblclick);
      }, // end initMouseHandling.
    }
    return that
  }
  
  $(document).ready(function(){    
    var sys = arbor.ParticleSystem();
    // create the system with sensible repulsion/stiffness/friction
    // use center-gravity to make the graph settle nicely (ymmv)
    sys.parameters({stiffness:1000, repulsion:10000, gravity:true, dt:0.015, friction:0.99})
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
    
    var thegraph = $.getJSON("grupos.json", function(data) {
      $.each(data.nodes, function(key, val) {
        sys.addNode(key, val)
        });
      $.each(data.edges, function(source, val) {
        $.each(val, function(dest, dummy) {
          sys.addEdge(source, dest)
        });
      });
    });
  })
})(this.jQuery)
