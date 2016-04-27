isc.VLayout.create({
	width: "100%",
	height: "100%",
	members: [createMenu(), createSplitPane()]
});

function createMenu() {
	return isc.ToolStrip.create({
		autoDraw: false,
		width: "100%",
		height: 28,
		margin: 2,
		members: []
	});
}

function createSplitPane() {
	return isc.HLayout.create({
		autoDraw: false,
		width: "100%",
		height: "100%",
		margin: 0,
		members: [createSectionStack(), createTabSet()]
	});
}

function createSectionStack() {
	return isc.SectionStack.create({
		autoDraw: false,
		visibilityMode: "single",
		width: 300,
		height: "100%",
		margin: 2,
		showResizeBar: true,
		sections: createSections()
	});
}

function createTabSet() {
	return isc.TabSet.create({
		autoDraw: false,
		margin: 2,
		tabBarPosition: "top",
		width: "100%",
		height: "100%",
		tabs: []
	});
}
