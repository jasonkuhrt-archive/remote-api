var lo = require('lodash');
var Emitter = require('emitter');
var log = require('debug')('remote-api-client');



// Create a client of a remote-api
var api = module.exports = function(uri, callback){

  // Create an iframe to communicate with the remote-api
  var iframe_el = window.document.createElement('iframe');
  iframe_el.src = uri;
  window.document.body.appendChild(iframe_el);


  // Partially apply make_function for the new iframe
  var make_function = lo.partialRight(api.make_function, iframe_el.contentWindow);

  // Create api object
  var emitter = api.make_client_emitter();


  // Core api method to destroy DOM (thus connection) and event listeners
  emitter.closeConnection = function(){
    window.document.body.removeChild(iframe_el);
    // TODO we cannot be hardcoding event names at the library-level!
    lo.each(['error', 'connection', 'disconnection'], function(e_name){ emitter.off(e_name); });
  };


  // Once the iframe is ready, ask
  // the remote-api to expose itwindow

  var on_server_ready = function(){
    iframe_el.removeEventListener(on_server_ready);
    log('iframe loaded');
    make_function('get_remote_api')(function(err, api){
      if (err) return console.error(err);
      log('got remote-api api description:', api);
      // Callback, with the remote-api exposed on api object
      lo.extend(emitter, map_zip(api.functions, make_function))
      callback(null, emitter);
    });
  };
  emitter.once('server-ready', on_server_ready);
};



api.make_function = function(command_name, peer){
  return function(){
    var callback = lo.last(arguments);
    var message = {
      type: 'function',
      name: command_name,
      args: lo.initial(arguments),
      timestamp: Date.now()
    };

    peer.postMessage(message, '*');
    window.addEventListener('message', returns_catcher);

    function returns_catcher(e){
      if (is_return(e.data, message)){
        window.removeEventListener('message', returns_catcher);
        callback.apply(null, e.data.returned);
      }
      // TODO timeout logic
      function is_return(possible_return, sent_command){
        return  possible_return.returned &&
                possible_return.name === sent_command.name &&
                possible_return.timestamp === sent_command.timestamp;
      }
    }
  }
};



// Trigger remote-api events
api.make_host_emitter = function(peer, target_origin){
  return function(name, args){
    var message = {type:'event', name:name, args: args || []};
    peer.postMessage(message, target_origin);
  }
}



// Access remote-api events
api.make_client_emitter = function(){
  var emitter = new Emitter();

  window.addEventListener('message', function(e){
    if (e.data.type === 'event'){
      emitter.emit.apply(emitter, [e.data.name].concat(e.data.args))
    }
  });
  return emitter;
};







// Helpers

function map_zip(collection, func){
  return lo.transform(collection, function(o, v){ o[v] = func(v); }, {});
}