(function() {

	var EVENTS = {
		CLICKED_MAIN_SECTION_ITEM: "CLICKED_MAIN_SECTION_ITEM",
		SELECTED_MAIN_TAB: "SELECTED_MAIN_TAB",
		FETCHED_GRID_DATA: "FETCHED_GRID_DATA",
		SELECTED_GRID_RECORDS: "SELECTED_GRID_RECORDS",
	};

	var ACTIONS = {
		FETCH_GRID_DATA: "FETCH_GRID_DATA",
		CLICKED_RELOAD_BUTTON: "CLICKED_RELOAD_BUTTON",
		CLICKED_REMOVE_BUTTON: "CLICKED_REMOVE_BUTTON",
	};

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
				rowClick: function(record) {
					if (_.isObject(record)) {
						var tabId = [section.id, record.id].join(".");
						Bus.fire(EVENTS.CLICKED_MAIN_SECTION_ITEM, tabId);
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

		Bus.on(EVENTS.CLICKED_MAIN_SECTION_ITEM, function(tabId) {
			var iscID = modelIdToIscId(tabId);
			if (_.isObject(tabset.getTab(iscID))) {
				tabset.selectTab(iscID);
			} else {
				var tab = model[tabId];
				tabset.addTab({
					ID: iscID,
					title: tab.title,
					canClose: true,
					pane: createComponent(model, tabId)
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

	function createComponent(model, id) {
		model[id].id = id;
		switch (model[id].type) {
			case "HLayout":
				return createLayout("HLayout", model, id);
			case "VLayout":
				return createLayout("VLayout", model, id);
			case "ListGrid":
				return createListGrid(model, id);
			case "IButton":
				return createIButton(model, id);
		}
	}

	function createLayout(layoutType, model, id) {
		var layoutModel = model[id];
		return isc[layoutType].create({
			// ID: modelIdToIscId(id),
			width: "100%",
			height: "100%",
			members: _.map(layoutModel.items, function(item) {
				var childId = id + "." + item.id;
				if (_.isString(item.type)) {
					model[childId] = item;
				}
				return createComponent(model, childId);
			})
		});
	}

	function createListGrid(model, id) {
		var gridModel = model[id];

		var lastSelectedIds = {}; // <record.id>: true

		var datasource = isc.DataSource.create({
			clientOnly: true,
			fields: gridModel.fields
		});

		var listenerRef = Bus.on(EVENTS.FETCHED_GRID_DATA, function(eventData) {
			var gridId = eventData.gridId;
			if (gridId === gridModel.id) {
				var gridData = eventData.gridData;

				var newSelectedIds = {};
				gridData.forEach(function(record) {
					if (lastSelectedIds[record.id] === true) {
						newSelectedIds[record.id] = true
					}
				});
				lastSelectedIds = newSelectedIds;

				datasource.setCacheData(gridData);
				// datasource.updateCaches({ operationType: "update", data: gridData });
				Bus.fire(EVENTS.SELECTED_GRID_RECORDS, id);
			}
		});

		var grid = isc.ListGrid.create({
			ID: modelIdToIscId(id),
			width: "100%",
			height: "100%",
			setAutoFitData: "both",
			alternateRecordStyles: true,
			canAutoFitFields: false,
			showFilterEditor: true,
			filterOnKeypress: true,
			canMultiSort: true,
			dataProperties: {
				useClientSorting: true,
				useClientFiltering: true
			},
			showAllRecords: true,
			// selectionProperty: '_selected',
			autoFetchData: true,
			dataSource: datasource,
			selectionChanged: function (record, state) {
				if (state === true) {
					lastSelectedIds[record.id] = true;
				} else {
					delete lastSelectedIds[record.id];
				}
			},
			selectionUpdated: function (record, recordList) {
				Bus.fire(EVENTS.SELECTED_GRID_RECORDS, id);
			},
			// filterData: function() {
			// 	this.Super("filterData", arguments);
			// 	reselect();
			// },
			dataArrived: function(startRow, endRow) {
				setTimeout(reselect, 0);
			},
			destroy: function() {
				this.Super("destroy", arguments);
				Bus.off(listenerRef);
			}
		});

		function reselect() {
			var records = _.filter(getAllGridRecords(id), function(record) {
				return lastSelectedIds[record.id];
			})
			getNative(id).selectRecords(records);
			Bus.fire(EVENTS.SELECTED_GRID_RECORDS, id);
		}

		Bus.execute(ACTIONS.FETCH_GRID_DATA, gridModel);

		return grid;
	}

	function createIButton(model, id) {
		var buttonModel = model[id];

		var listenerRef;
		if (buttonModel.boundToGridId) {
			listenerRef = Bus.on(EVENTS.SELECTED_GRID_RECORDS, function(gridId) {
				if (gridId === buttonModel.boundToGridId) {
					var records = getGridVisibleSelectedRecords(gridId);
					getNative(id).setEnabled((buttonModel.minSelectedCount || 0) <= records.length);
					if (buttonModel.displaySelectedCount) {
						getNative(id).setTitle(buttonModel.title + " (" + records.length + ")")
					}
				}
			});
		}

		return isc.IButton.create({
			ID: modelIdToIscId(id),
			title: buttonModel.title,
			width: 150,
			enabled: (buttonModel.minSelectedCount || 0) === 0,
			click: function() {
				Bus.execute(buttonModel.action, buttonModel);
			},
			destroy: function() {
				Bus.off(listenerRef);
				return this.Super("destroy", arguments);
			}
		});
	}

	function getNative(id) {
		return window[modelIdToIscId(id)];
	}

	function getGridVisibleSelectedRecords(gridId) {
		return getNative(gridId).getSelectedRecords();
	}

	function getAllGridRecords(gridId) {
		return getNative(gridId).getData().getAllCachedRows();
	}

	function render(model) {
		isc.VLayout.create({
			width: "100%",
			height: "100%",
			members: [createMainMenu(model), createMainSplitPane(model)]
		});
	}

	$.getJSON("/generated/model.json", function(model) {
		createHandlers(model);
		render(model);
	});

	function createHandlers(model) {
		Bus.handle(ACTIONS.FETCH_GRID_DATA, function(gridModel) {
			getNative(gridModel.id).invalidateCache();
			$.getJSON(gridModel.endpoint, function(response) {
				if (response.ok === true) {
					Bus.fire(EVENTS.FETCHED_GRID_DATA, { gridId: gridModel.id, gridData: response.data });
				} else {
					throw "Error response: " + JSON.stringify(response);
				}
			});
		});

		Bus.handle(ACTIONS.CLICKED_RELOAD_BUTTON, function(buttonModel) {
			var gridModel = model[buttonModel.boundToGridId];
			Bus.execute(ACTIONS.FETCH_GRID_DATA, gridModel);
		});

		Bus.handle(ACTIONS.CLICKED_REMOVE_BUTTON, function(buttonModel) {
			var gridModel = model[buttonModel.boundToGridId];
		});
	}
})();
