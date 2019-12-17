Meteor.publish(null, function () {
    var userId = this.userId,
        fields = {meteorTable: 1};
    return Meteor.users.find({_id: userId}, {fields: fields});
});

var getExcelValue = function (value, type, options) {
    if (_.isNull(value)) {
        return "";
    }
    switch (type) {
        case MeteorTable.FIELD_TYPE_DATE:
            if (moment(value).isValid()) {
                return value;
            }
            return "";
        case MeteorTable.FIELD_TYPE_SELECT:
            if (!_.isUndefined(options[value])) {
                return options[value];
            }
            return value;
        //case MeteorTable.FIELD_TYPE_CHECKBOX:
        //    return value ? 'Yes' : 'No';
        default:
            return value;
    }
};

//var getFieldValue = function (obj, field) {
//    var keys = field.split('.');
//    var value = obj;
//
//    _.each(keys, function (key) {
//        if (_.isObject(value) && _.isFunction(value[key])) {
//            value = value[key]();
//        } else if (_.isObject(value) && !_.isUndefined(value[key])) {
//            value = value[key];
//        } else {
//            value = "";
//        }
//    });
//
//    return value;
//};

MeteorTable.publish = function (name, collectionOrFunction, selectorOrFunction, getValueForExcel, wrappingSelectorFunction) {

    Meteor.publish("meteor-table-" + name, function (publicationId, fields, columnOrder, limit, skip, sort, sortOrder, filters, dataFilters, selectorFilters, dateFormatMoment) {

        check(fields, Object);
        check(columnOrder, Array);
        check(limit, Match.OneOf(Number, Boolean));
        check(skip, Match.OneOf(Number, Boolean));
        check(sort, Match.OneOf(String, Boolean));
        check(sortOrder, Match.OneOf(String, Boolean));
        check(dateFormatMoment, String);
        check(selectorOrFunction, Match.OneOf(Object, Function));
        check(wrappingSelectorFunction, Match.OneOf(Function, undefined));

        var collection;
        var selector = {};

        if (_.isFunction(collectionOrFunction)) {
            collection = collectionOrFunction.call(this);
        } else {
            collection = collectionOrFunction;
        }

        let data = [];

        if (collection instanceof Mongo.Collection) {

            if (_.isFunction(selectorOrFunction)) {
                selector = selectorOrFunction.call(this);
            } else {
                selector = selectorOrFunction;
            }

            if (!_.isEmpty(selector)) {
                selector = {$and: [selector, selectorFilters]};
            } else {
                selector = selectorFilters;
            }

            if (_.isFunction(wrappingSelectorFunction)) {
                selector = wrappingSelectorFunction.call(this, selector);
            }

            var params = MeteorTable.getParams(fields, columnOrder, limit, skip, sort, sortOrder);

            var countData = collection.find(selector);
            Counts.publish(this, 'meteor-table-count-' + name, countData, {noReady: true, nonReactive: true});

            var cursor = collection.find(selector, params);
            data = cursor.fetch();

        } else if (_.isFunction(collection)) {

            let count;
            [data, count] = collection.call(this, fields, columnOrder, limit, skip, sort, sortOrder, filters, dataFilters, selectorFilters, dateFormatMoment);
            if (!_.isUndefined(data)) {
                data.push({_id: 'count', count: count});
            }

        } else {
            console.log("MeteorTable.publish: no collection to publish or data function");
            return [];
        }

        // console.log(data);

        //var Future = Npm.require('fibers/future');
        //var futureResponse = new Future();
        //
        //Meteor.setTimeout(function () {
        //
        //    Counts.publish(this, 'meteor-table-count-' + name, collection.find(selector), {noReady: true});
        //    futureResponse.return(collection.find(selector, params));
        //
        //}.bind(this), 1000);
        //
        //return futureResponse.wait();
        //
        //var util = Npm.require('util');
        //console.log(util.inspect(selector, false, null));
        //console.log(util.inspect(params, false, null));

        var self = this;

        var getRow = function (row, index) {
            return _.extend({
                "meteor-table-id": publicationId,
                "meteor-table-sort": index
            }, row);
        };

        var getRows = function () {
            return _.map(data, getRow);
        };

        var rows = {};
        _.each(getRows(), function (row) {
            rows[row._id] = row;
        });

        _.each(rows, function (row) {
            self.added("meteor-table-rows-" + publicationId, row._id, row);
        });

        if (collection instanceof Mongo.Collection) {

            var initializing = true;

            var updateRows = function () {
                _.each(getRows(), function (row, index) {
                    var oldRow = rows[row._id];
                    if (oldRow) {
                        if (!_.isEqual(oldRow, row)) {
                            self.changed("meteor-table-rows-" + publicationId, row._id, row);
                            rows[row._id] = row;
                        }
                    } else {
                        self.added("meteor-table-rows-" + publicationId, row._id, row);
                        rows[row._id] = row;
                    }
                });
            };

            var handle = cursor.observe({
                added: function () {
                    if (!initializing) {
                        updateRows();
                    }
                },
                removed: function (id) {
                    if (!_.isUndefined(rows[id])) {
                        self.removed("meteor-table-rows-" + publicationId, id);
                        delete rows[id];
                        updateRows();
                    }
                },
                changed: function () {
                    updateRows();
                }
            });

            initializing = false;

            self.onStop(function () {
                handle.stop();
            });

        }

        self.ready();

    });

    var methods = {};
    methods['meteorTableDownloadExcelFile' + name] = function (fieldsExcel, columnsOrderExcel, shownColumnsExcel, limitExcel, skipExcel, sortExcel, sortOrderExcel, filtersExcel, dataFiltersExcel, selectorFiltersExcel, dateFormatMomentExcel) {

        var loggedInUser = Meteor.user();
        if (!loggedInUser) {
            throw new Meteor.Error(403, "Access denied");
        }

        var collection;
        var selector = {};

        if (_.isFunction(collectionOrFunction)) {
            collection = collectionOrFunction.call(this);
        } else {
            collection = collectionOrFunction;
        }

        var data = [];

        if (collection instanceof Mongo.Collection) {

            if (_.isFunction(selectorOrFunction)) {
                selector = selectorOrFunction.call(this);
            } else {
                selector = selectorOrFunction;
            }

            if (!_.isEmpty(selector)) {
                selector = {$and: [selector, selectorFiltersExcel]};
            } else {
                selector = selectorFiltersExcel;
            }

            if (_.isFunction(wrappingSelectorFunction)) {
                selector = wrappingSelectorFunction.call(this, selector);
            }

            var params = MeteorTable.getParams(fieldsExcel, shownColumnsExcel, limitExcel, skipExcel, sortExcel, sortOrderExcel);
            params.limit = 0;
            params.skip = 0;

            var cursor = collection.find(selector, params);
            data = cursor.fetch();

        } else if (_.isFunction(collection)) {

            data = collection.call(this, fieldsExcel, columnsOrderExcel, 0, 0, sortExcel, sortOrderExcel, filtersExcel, dataFiltersExcel, selectorFiltersExcel, dateFormatMomentExcel);

        } else {
            console.log("MeteorTable.publish: no collection to publish or data function");
            return [];
        }


        var Future = Npm.require('fibers/future');
        var futureResponse = new Future();

        var excel = new Excel('xlsx'); // Create an excel object  for the file you want (xlsx or xls)
        var workbook = excel.createWorkbook(); // Create a workbook (equivalent of an excel file)
        var worksheet = excel.createWorksheet(); // Create a worksheet to be added to the workbook

        var columns = [];
        _.each(columnsOrderExcel, function (value) {
            if (_.contains(shownColumnsExcel, value) && _.has(fieldsExcel, value)) {
                columns.push(value);
            }
        });

        var i = 0;
        _.each(columns, function (column) {
            worksheet.writeToCell(0, i, fieldsExcel[column].title);
            i++;
        });

        var row = 1;
        data.forEach(function (dataRow) {
            var i = 0;
            _.each(columns, function (column) {
                var fieldKey = fieldsExcel[column].key;
                var options = fieldsExcel[column].options || {};
                var type = fieldsExcel[column].type;
                var fieldValue = MeteorTable.getFieldValue(dataRow, fieldKey);
                var cellValue = false;
                if (_.isFunction(getValueForExcel)) {
                    cellValue = getValueForExcel.call(this, column, fieldKey, fieldValue, dataRow);
                }
                if (cellValue === false) {
                    cellValue = getExcelValue(fieldValue, type, options);
                }
                worksheet.writeToCell(row, i, cellValue);
                i++;
            });
            row++;
        });

        workbook.addSheet(name, worksheet);

        var uuid = UUID.v4();
        var filename = name + '.xlsx';

        var fileAbsName = (!_.isUndefined(process.env.WWW_FOLDER_PREFIX) ? process.env.WWW_FOLDER_PREFIX : '') + '/www/files/' + uuid + '/' + filename;

        mkdirp((!_.isUndefined(process.env.WWW_FOLDER_PREFIX) ? process.env.WWW_FOLDER_PREFIX : '') + '/www/files/' + uuid, Meteor.bindEnvironment(function (err) {
            if (err) {
                console.log('Error creating tmp dir', err);
                futureResponse.throw(err);
            } else {
                workbook.writeToFile(fileAbsName);
                futureResponse.return(process.env.ROOT_URL + '/files/' + uuid + '/' + encodeURIComponent(filename));
            }
        }));

        return futureResponse.wait();
    };

    Meteor.methods(methods);
};
