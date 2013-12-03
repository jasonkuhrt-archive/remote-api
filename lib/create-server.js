var lo = require('lodash');
var log = require('debug')('remote-api');
var msg_model = require('./message-model');
var chain = lo.curry(function(handlers, value){
  lo.reduce(handlers, function(acc, f, index){
    return lo.isUndefined(acc) ? acc : f(acc) ;
  }, value);
});
var util = require('./util');



module.exports = function(origin, api){
  var post = util.makePostMessage(window.parent, origin);
  window.addEventListener('message', chain([
    ignore_own_messages,
    log_message,
    handle_get_remote_api(post, api),
    handle_invalid_message(api),
    reply(post, api)
  ]));
  util.emit(post, 'server-ready', []);

  return {
    emit: util.emit(post)
  };
};










// Middleware for server

function ignore_own_messages(e){
  // TODO this makes it so that client cannot send events...
  // should just be: (e.origin !== location.origin)
  if (e.data && !lo.has(e.data, 'returned') && e.data.type !== 'event') return e.data;
}

function log_message(msg){
  log('<', msg);
  return msg;
}

var handle_get_remote_api = lo.curry(function(scopedPostMessage, api, msg){
  if (msg.name === 'get_remote_api'){
    util.makeFunctionCallback(scopedPostMessage, msg)(null, {
      functions: lo.keys(lo.pick(api, lo.isFunction))
    });
  } else {
    return msg;
  }
});

var handle_invalid_message = lo.curry(function(api, msg){
  if (!msg.name || !lo.isFunction(api[msg.name])){
    console.error(new ReferenceError('remote-api server cannot process message'), msg)
  } else {
    return msg;
  }
});

// Reply to a peer invocation of some function

var reply = lo.curry(function(scopedPostMessage, api, peer_msg){
  var func = api[peer_msg.name];
  var arg_callback = util.makeFunctionCallback(scopedPostMessage, peer_msg);
  var args = peer_msg.args.concat([arg_callback]);
  func.apply(null, args);
});

