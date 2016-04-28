(function() {

	var EVENTS = {
		OPEN_MAIN_TAB: "OPEN_MAIN_TAB",
		SELECTED_MAIN_TAB: "SELECTED_MAIN_TAB"
	};

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
			var treeData = _.map(section.items, function(item) {
				return {
					id: item.id,
					title: item.title,
					parentId: item.parentId
				};
			});

			var treeGrid = isc.TreeGrid.create({
				showHeader: false,
				showRoot: false,
				selectionType: "single",
				fields: [{
					name: 'title'
				}],
				data: isc.Tree.create({
					modelType: 'parent',
					idField: 'id',
					parentIdField: 'parentId',
					data: treeData
				}),
				selectionUpdated: function(record, recordList) {
					if (_.size(recordList) > 0) {
						var tabId = [section.id, recordList[0].id].join(".");
						Bus.fire(EVENTS.OPEN_MAIN_TAB, tabId);
					}
				}
			});

			Bus.on(EVENTS.SELECTED_MAIN_TAB, function(id) {
				var recordId = id.split(section.id + ".")[1];
				var toSelect = [];
				var toDeselect = [];
				_.each(treeData, function(record) {
					if (record.id === recordId) {
						toSelect.push(record);
					} else {
						toDeselect.push(record);
					}
				});
				treeGrid.deselectRecords(toDeselect);
				treeGrid.selectRecords(toSelect);
			});

			return {
				title: section.title,
				expanded: section.expanded,
				items: [treeGrid]
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
		var tabset = isc.TabSet.create({
			autoDraw: false,
			margin: 2,
			tabBarPosition: "top",
			width: "100%",
			height: "100%",
			tabs: [],
			tabSelected: function(tabNum, tabPane, ID, tab, name) {
				Bus.fire(EVENTS.SELECTED_MAIN_TAB, iscIdToModelId(ID));
			}
		});

		Bus.on(EVENTS.OPEN_MAIN_TAB, function(tabId) {
			var iscID = modelIdToIscId(tabId);
			if (_.isObject(tabset.getTab(iscID))) {
				tabset.selectTab(iscID);
			} else {
				var tab = model[tabId];
				tabset.addTab({
					ID: iscID,
					title: tab.title,
					canClose: true
				});
				tabset.selectTab(iscID);
			}
		});

		return tabset;
	}

	function modelIdToIscId(id) {
		return "sc__" + id.split(".").join("__");
	}

	function iscIdToModelId(id) {
		return _.rest(id.split("__")).join(".");
	}


})();
