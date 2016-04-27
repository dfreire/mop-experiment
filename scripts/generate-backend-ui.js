var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var out = path.join('.', 'backend-ui', 'generated');

function generateSections() {
    var sections = require('../model/backend-ui/sections/sections.json');
    var sectionsJs = "";

    sectionsJs += "function createSections() {";
    sectionsJs += "return [";

    _.each(sections, function (section) {
        sectionsJs += "{";

        sectionsJs += "title: '" + section.title + "',";
        sectionsJs += "expanded:" + (section.expanded || "false") + ",";

        sectionsJs += "items: [ isc.TreeGrid.create({";

        sectionsJs += "showHeader: false,";
        sectionsJs += "showRoot: false,";
        sectionsJs += "fields: [{ name: 'title' }],";

        sectionsJs += "data: isc.Tree.create({";
        sectionsJs += "modelType: 'parent',";
        sectionsJs += "idField: 'id',";
        sectionsJs += "parentIdField: 'parentId',";
        sectionsJs += "data: [";
        _.each(section.records, function (record) {
            sectionsJs += "{";
            if (record.parentId) {
                sectionsJs += "parentId: '" + record.parentId +"',";
            }
            sectionsJs += "id: '" + record.id +"',";
            sectionsJs += "title: '" + record.title +"',";
            sectionsJs += "},";
        });
        sectionsJs += "]";
        sectionsJs += "})"

        sectionsJs += "})]";

        sectionsJs += "},";
    });

    sectionsJs += "];";
    sectionsJs += "}";

    fs.writeFileSync(path.join(out, 'sections.js'), sectionsJs);
}

generateSections();
