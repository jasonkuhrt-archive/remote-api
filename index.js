var _ = require('lodash');
var Emitter = require('emitter');

var api = module.exports = {};
var self = window;

api.make_function = function(command_name, peer){
  return function(){
    var callback = _.last(arguments);
    var message = {
      type: 'function',
      name: command_name,
      args: _.initial(arguments),
      timestamp: Date.now()
    };

    peer.postMessage(message, '*');
    self.addEventListener('message', returns_catcher);

    function returns_catcher(e){
      if (is_return(e.data, message)){
        self.removeEventListener('message', returns_catcher);
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
}

api.make_host_emitter = function(peer, target_origin){
  return function(name, args){
    var message = {type:'event', name:name, args: args || []};
    peer.postMessage(message, target_origin);
  }
}

api.make_client_emitter = function(){
  var emitter = new Emitter();
  self.addEventListener('message', function(e){
    if (e.data.type === 'event'){
      emitter.emit.apply(emitter, [e.data.name].concat(e.data.args))
    }
  });
  return emitter;
};

api.make_api = function(func_names, peer){
  var emitter = api.make_client_emitter();
  var functions = map_zip(func_names, _.partialRight(api.make_function, peer))
  return _.extend(emitter, functions);
};


// Helpers

function map_zip(collection, func){
  return _.transform(collection, function(o, v){ o[v] = func(v); }, {});
}