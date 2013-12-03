var lo = require('lodash');
var Emitter = require('emitter');
var waterfall = require('async-waterfall');
var log = require('debug')('remote-api-client');
var util = require('./util');

function map_zip(collection, func){
  return lo.transform(collection, function(o, v){ o[v] = func(v); }, {});
}
function inject_iframe(uri, node){
  var iframe_el = window.document.createElement('iframe');
  iframe_el.src = uri;
  node.appendChild(iframe_el);
  return iframe_el;
}



module.exports = function(uri, callback){

  // TODO derive origin from uri

  // Create an iframe to communicate with the remote-api
  var iframe_el = inject_iframe(uri, window.document.body);


  // Partially apply make_function for the new iframe
  var post = util.makePostMessage(iframe_el.contentWindow, '*');
  var make_function = util.makeFunction(post);


  // Create api object
  var emitter = util.makeEmitter();

  // Add api method to destroy DOM (thus connection) and event listeners
  emitter.closeConnection = function(){
    window.document.body.removeChild(iframe_el);
    // TODO we cannot be hardcoding event names at the library-level!
    lo.each(['error', 'connection', 'disconnection'], function(e_name){ emitter.off(e_name); });
  };

  // Once the iframe is ready, ask
  // the remote-api to expose its API
  // and give it back to the caller

  var merge_remote_api = lo.curry(function(existing_api, api, callback){
    callback(null, lo.extend(existing_api, map_zip(api.functions, make_function)));
  });

  var pass_remote_api_to_caller = lo.partial(waterfall, [
    make_function('get_remote_api'),
    merge_remote_api(emitter),
  ], callback);

  emitter.on('server-ready', pass_remote_api_to_caller);
};