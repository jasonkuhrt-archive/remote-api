var lo = require('lodash');
var msg_model = module.exports = {};

msg_model.event = function(name, payload){
  return {
    type: 'event',
    name: name,
    args: payload || []
  };
};

msg_model.func_return = function(func_msg, return_args){
  return lo.merge({}, func_msg, {
    type: 'function-return',
    returned: lo.toArray(return_args)
  });
};

msg_model.func = function(name, args){
  return {
    type: 'function',
    name: name,
    args: args,
    timestamp: Date.now()
  };
};

msg_model.isFunc = function(msg){
  return msg.type === 'function';
};

msg_model.isEvent = function(msg){
  return msg.type === 'event';
};

msg_model.isFuncReturn = function(msg){
  return msg.type === 'function-return';
};
