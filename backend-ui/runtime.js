(function() {

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
				callbacks = _.filter(callbacks, function(item) { item.callbackRef !== callbackRef });
			},
			once: function(eventId, callback) {
				var callbackRef = Bus.on(eventId, _.wrap(callback, function (eventData) {
					Bus.off(eventId, callbackRef);
					Bus.callback(eventData);
				}));
			},
			fire: function(eventId, eventData) {
				console.log("fire", eventId, JSON.stringify(eventData));
				_.each(callbacks, function (item) {
					if (item.eventId === eventId) {
						item.callbackFn(eventData);
					}
				});
			},
			handle: function(callId, callback) {
				handlers[callId] = callback;
			},
			call: function(callId, callData) {
				if (!_.isFunction(handlers[callId])) {
					throw "No handler for " + callId;
				}
				return handlers[callId](callData);
			}
		};
	})();

	$.getJSON("/generated/model.json", function(model) {
		console.log("model", model);
		render(model);
	});

	function render(model) {
		isc.VLayout.create({
			width: "100%",
			height: "100%",
			members: [createMainMenu(model), createMainSplitPane(model)]
		});
	}

	function createMainMenu(model) {
		return isc.ToolStrip.create({
			autoDraw: false,
			width: "100%",
			height: 28,
			margin: 2,
			members: []
		});
	}

	function createMainSplitPane(model) {
		return isc.HLayout.create({
			autoDraw: false,
			width: "100%",
			height: "100%",
			margin: 0,
			members: [createMainSectionStack(model), createMainTabSet(model)]
		});
	}

	function createMainSectionStack(model) {

		function createMainSection(section) {
			return {
				title: section.title,
				expanded: section.expanded,
				items: [isc.TreeGrid.create({
					showHeader: false,
					showRoot: false,
					selectionUpdated: function(record, recordList) {
						if (_.size(recordList) > 0) {
							var id = [section.id, recordList[0].id].join(".");
							Bus.fire("selectionUpdated", id);
							// console.log("selectionUpdated", id);
						}
					},
					fields: [{
						name: 'title'
					}],
					data: isc.Tree.create({
						modelType: 'parent',
						idField: 'id',
						parentIdField: 'parentId',
						data: _.map(section.items, function(item) {
							return {
								id: item.id,
								title: item.title,
								parentId: item.parentId
							};
						})
					})
				})]
			};
		}

		return isc.SectionStack.create({
			autoDraw: false,
			visibilityMode: "mutex",
			width: 300,
			height: "100%",
			margin: 2,
			showResizeBar: true,
			sections: _.map(model.sections.items, createMainSection)
		});
	}

	function createMainTabSet(model) {
		return isc.TabSet.create({
			autoDraw: false,
			margin: 2,
			tabBarPosition: "top",
			width: "100%",
			height: "100%",
			tabs: []
		});
	}

})();
