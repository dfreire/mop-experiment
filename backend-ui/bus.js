var Bus = (function() {
    var callbacks = []; // [{ eventId: ..., callbackRef: ..., callbackFn: ... }]
    var nextCallbackRef = 0;
    var handlers = {};

    return {
        on: function(eventId, callback) {
            var item = {
                eventId: eventId,
                callbackRef: nextCallbackRef++,
                callbackFn: callback
            };
            callbacks.push(item);
            return item.callbackRef;
        },
        off: function(eventId, callbackRef) {
            callbacks = _.filter(callbacks, function(item) {
                item.callbackRef !== callbackRef
            });
        },
        once: function(eventId, callback) {
            var callbackRef = Bus.on(eventId, _.wrap(callback, function(data) {
                Bus.off(eventId, callbackRef);
                Bus.callback(data);
            }));
        },
        fire: function(eventId, data) {
            _.each(callbacks, function(item) {
                if (item.eventId === eventId) {
                    item.callbackFn(data);
                }
            });
        },
        handle: function(actionId, handler) {
            handlers[actionId] = handler;
        },
        execute: function(actionId, data) {
            if (_.isFunction(handlers[actionId])) {
                handlers[actionId](data);
            } else {
                throw "No handler for " + actionId;
            }
        }
    };
})();
