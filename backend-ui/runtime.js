(function() {

	var EVENTS = {
		CLICKED_MAIN_SECTION_ITEM: "CLICKED_MAIN_SECTION_ITEM",
		SELECTED_MAIN_TAB: "SELECTED_MAIN_TAB",
	};

	var ACTIONS = {
		FETCH_GRID_DATA: "FETCH_GRID_DATA",
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
		console.log("createComponent", id);
		switch (model[id].type) {
			case "VLayout":
				return createVLayout(model, id);
			case "ListGrid":
				return createListGrid(model, id);
		}
	}

	function createVLayout(model, id) {
		var layoutModel = model[id];
		return isc.VLayout.create({
			// ID: modelIdToIscId(id),
			width: "100%",
			height: "100%",
			showEmptyMessage: false,
			showFilterEditor: true,
			members: _.map(layoutModel.items, function(item) {
				var childId = id + "." + item.id;
				return createComponent(model, childId);
			})
		});
	}

	function createListGrid(model, id) {
		var gridModel = model[id];

		var datasource = isc.DataSource.create({
			clientOnly: true,
			fields: gridModel.fields
		});

		var grid = isc.ListGrid.create({
			// ID: modelIdToIscId(id),
			width: "100%",
			height: "100%",
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
			autoFetchData: true,
			dataSource: datasource
		});

		function fetchGridData() {
			Bus.execute(ACTIONS.FETCH_GRID_DATA, { gridId: id, gridModel: gridModel }, function(data) {
				datasource.setCacheData(data);
			});
		}

		fetchGridData();

		return grid;
	}

	function render(model) {
		isc.VLayout.create({
			width: "100%",
			height: "100%",
			members: [createMainMenu(model), createMainSplitPane(model)]
		});
	}

	$.getJSON("/generated/model.json", function(model) {
		console.log("model", model);
		createRules(model);
		render(model);
	});

	function createRules(model) {
		Bus.handle(ACTIONS.FETCH_GRID_DATA, function(requestData, callback) {
			console.log(ACTIONS.FETCH_GRID_DATA, requestData.gridModel.endpoint);

			$.getJSON(requestData.gridModel.endpoint, function(response) {
				if (response.ok === true) {
					callback(response.data);
				} else {
					throw "Error response: " + JSON.stringify(response);
				}
			});
		});
	}
})();
