var lo = require('lodash');
var Emitter = require('emitter');
var msg_model = require('./message-model');
var log = require('debug')('remote-api');

var util = module.exports = {};



// Make a postMessage function

util.makePostMessage = function(host, origin){
  var postMessage = lo.bind(host.postMessage, host);
  return lo.partialRight(postMessage, origin);
};

// Make a function that replies to a peer's function invocation

util.makeFunctionCallback = function(scoped_post_message, peer_func_msg){
  return function(){
    log('>', arguments);
    scoped_post_message(msg_model.func_return(peer_func_msg, arguments));
  }
};

// Make an async function that will call the peer
//
// @func_name
// The function name the the peer will match aginst its remote api
//
// @scoped_post_message
// Function to send msg to peer
//
// Returns an Async function which, when invoked, will send its
// (args initial) arguments to the peer, and use the given
// (args tail) callback to provide the return.
util.makeFunction = lo.curry(function(scoped_post_message, func_name){
  return function(){
    var func_msg = msg_model.func(func_name, lo.initial(arguments));
    var callback = lo.last(arguments);
    util.call(scoped_post_message, func_msg, callback);
  }
});

util.call = function(scoped_post_message, func_msg, callback){
  scoped_post_message(func_msg);
  window.addEventListener('message', do_catch_func_return);
  // TODO timeout logic

  function do_catch_func_return(e){
    if (is_func_msgs_return(func_msg, e.data)){
      window.removeEventListener('message', do_catch_func_return);
      callback.apply(null, e.data.returned);
    }
  }
};

// Emit events that peers may listen on

util.emit = lo.curry(function(scoped_post_message, name, payload){
  log('^', msg_model.event(name, payload));
  scoped_post_message(msg_model.event(name, payload));
});

// TODO support origin argument
// TODO rename to makeListener or just generally refactor
util.makeEmitter = function(){
  return lo.tap(new Emitter(), function(emitter){
    window.addEventListener('message', function(e){
      if (msg_model.isEvent(e.data)){
        emitter.emit.apply(emitter, [e.data.name].concat(e.data.args))
      }
    });
  });
};



// Helpers

var is_func_msgs_return = function(func_msg_sent, msg){
  return  msg_model.isFuncReturn(msg) &&
          msg.name === func_msg_sent.name &&
          msg.timestamp === func_msg_sent.timestamp;
};