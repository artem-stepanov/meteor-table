Meteor.publish(null, function () {
    var userId = this.userId,
        fields = {meteorTable: 1};
    return Meteor.users.find({_id: userId}, {fields: fields});
});

MeteorTable = {};

var isNumeric = function (input) {
    var RE = /^-?(0|INF|(0[1-7][0-7]*)|(0x[0-9a-fA-F]+)|((0|[1-9][0-9]*|(?=[\.,]))([\.,][0-9]+)?([eE]-?\d+)?))$/;
    return (RE.test(input));
};

var getSelectors = function (selector, filters, dataFilters, dateFormatMoment) {
    var additionalSelector = [];
    _.each(filters, function (filter) {
        var elem = {};
        if (filter.type == METEOR_TABLE_FIELD_TYPE_DATE) {
            var elemStart = {};
            if (_.has(dataFilters, filter.name + 'DateFrom')) {
                var dateStart = dataFilters[filter.name + 'DateFrom'];
                if (dateStart !== '') {
                    dateStart = moment(dateStart, dateFormatMoment);
                    elemStart = {'$gte': dateStart.toDate()};
                }
            }
            var elemEnd = {};
            if (_.has(dataFilters, filter.name + 'DateTo')) {
                var dateEnd = dataFilters[filter.name + 'DateTo'];
                if (dateEnd !== '') {
                    dateEnd = moment(dateEnd, dateFormatMoment);
                    elemEnd = {'$lt': dateEnd.add(1, 'd').toDate()};
                }
            }
            var dateFromTo = _.extend(elemStart, elemEnd);
            if (!_.isEmpty(dateFromTo)) {
                elem[filter.key] = dateFromTo;
                additionalSelector.push(elem);
            }
        } else if (_.has(dataFilters, filter.name)) {
            var value = dataFilters[filter.name];
            if (value !== "") {
                value = value.split("\r\n");
                var keys = [];
                if (_.isArray(filter.key)) {
                    keys = filter.key;
                } else {
                    keys = [filter.key];
                }
                var orselector = [];
                _.each(value, function (curValue) {
                    if (filter.type == METEOR_TABLE_FIELD_TYPE_STRING || filter.type == METEOR_TABLE_FIELD_TYPE_TEXT) {
                        curValue = curValue.toString();
                    } else {
                        curValue = isNumeric(curValue) ? parseFloat(curValue) : curValue;
                    }
                    _.each(keys, function (key) {
                        var orelem = {};
                        if (filter.type == METEOR_TABLE_FIELD_TYPE_SELECT) {
                            orelem[key] = curValue;
                        } else {
                            orelem[key] = {$regex: curValue, $options: "i"};
                        }
                        orselector.push(orelem);
                    });
                });
                if (orselector.length == 1) {
                    elem = orselector.shift();
                } else {
                    elem['$or'] = orselector;
                }
                additionalSelector.push(elem);
            }
        }
    });

    if (!_.isEmpty(additionalSelector)) {
        if (additionalSelector.length == 1) {
            additionalSelector = additionalSelector.shift();
        } else {
            additionalSelector = {$and: additionalSelector};
        }
        if (!_.isEmpty(selector)) {
            selector = {$and: [selector, additionalSelector]};
        } else {
            selector = additionalSelector;
        }
    }
    return selector;
};

var getParams = function (fields, columnOrder, limit, skip, sort, sortOrder) {
    var params = {limit: limit, skip: skip};
    if (sortOrder) {
        params.sort = [[sort, sortOrder]];
    }
    //var fieldsReturn = {};
    //_.each(columnOrder, function (column) {
    //    fieldsReturn[fields[column].key] = 1;
    //});
    //params.fields = fieldsReturn;
    return params;
};

var getExcelValue = function (value, type, options) {
    if (_.isNull(value)) {
        return "";
    }
    switch (type) {
        case METEOR_TABLE_FIELD_TYPE_DATE:
            if (moment(value).isValid()) {
                return value;
            }
            return "";
        case METEOR_TABLE_FIELD_TYPE_SELECT:
            if (!_.isUndefined(options[value])) {
                return options[value];
            }
            return value;
        //case METEOR_TABLE_FIELD_TYPE_CHECKBOX:
        //    return value ? 'Yes' : 'No';
        default:
            return value;
    }
};

var getFieldValue = function (obj, field) {
    var keys = field.split('.');
    var value = obj;

    _.each(keys, function (key) {
        if (_.isObject(value) && _.isFunction(value[key])) {
            value = value[key]();
        } else if (_.isObject(value) && !_.isUndefined(value[key])) {
            value = value[key];
        } else {
            value = "";
        }
    });

    return value;
};

temporaryFiles.allow({
    insert: function (userId, file) {
        return false;
    },
    remove: function (userId, file) {
        return false;
    },
    read: function (userId, file) {
        return (userId === file.metadata.owner);
    },
    write: function (userId, file, fields) {
        return false;
    }
});

MeteorTable.publish = function (name, collectionOrFunction, selectorOrFunction, getValueForExcel) {

    Meteor.publish("meteor-table-" + name, function (fields, columnOrder, limit, skip, sort, sortOrder, filters, dataFilters, dateFormatMoment) {

        check(fields, Object);
        check(columnOrder, Array);
        check(limit, Match.OneOf(Number, Boolean));
        check(skip, Match.OneOf(Number, Boolean));
        check(sort, Match.OneOf(String, Boolean));
        check(sortOrder, Match.OneOf(String, Boolean));
        check(dateFormatMoment, String);

        var collection;
        var selector = {};

        if (_.isFunction(collectionOrFunction)) {
            collection = collectionOrFunction.call(this);
        } else {
            collection = collectionOrFunction;
        }

        if (!(collection instanceof Mongo.Collection)) {
            console.log("MeteorTable.publish: no collection to publish");
            return [];
        }

        if (_.isFunction(selectorOrFunction)) {
            selector = selectorOrFunction.call(this);
        } else {
            selector = selectorOrFunction;
        }

        selector = getSelectors(selector, filters, dataFilters, dateFormatMoment);
        var params = getParams(fields, columnOrder, limit, skip, sort, sortOrder);


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

        Counts.publish(this, 'meteor-table-count-' + name, collection.find(selector), {noReady: true});
        return collection.find(selector, params);

    });

    var methods = {};
    methods['meteorTableDownloadExcelFile' + name] = function (fieldsExcel, columnsOrderExcel, shownColumnsExcel, limitExcel, skipExcel, sortExcel, sortOrderExcel, filtersExcel, dataFiltersExcel, dateFormatMomentExcel) {

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

        if (!(collection instanceof Mongo.Collection)) {
            console.log("MeteorTable.publish: no collection to publish");
            return [];
        }

        if (_.isFunction(selectorOrFunction)) {
            selector = selectorOrFunction.call(this);
        } else {
            selector = selectorOrFunction;
        }

        var Future = Npm.require('fibers/future');
        var futureResponse = new Future();

        var excel = new Excel('xlsx'); // Create an excel object  for the file you want (xlsx or xls)
        var workbook = excel.createWorkbook(); // Create a workbook (equivalent of an excel file)
        var worksheet = excel.createWorksheet(); // Create a worksheet to be added to the workbook

        var i = 0;
        _.each(shownColumnsExcel, function (column) {
            worksheet.writeToCell(0, i, fieldsExcel[column].title);
            i++;
        });

        selector = getSelectors(selector, filtersExcel, dataFiltersExcel, dateFormatMomentExcel);
        var params = getParams(fieldsExcel, shownColumnsExcel, limitExcel, skipExcel, sortExcel, sortOrderExcel);
        params.limit = 0;
        params.skip = 0;

        var row = 1;
        collection.find(selector, params).forEach(function (dataRow) {
            var i = 0;
            _.each(shownColumnsExcel, function (column) {
                var fieldKey = fieldsExcel[column].key;
                var options = fieldsExcel[column].options || {};
                var type = fieldsExcel[column].type;
                var fieldValue = getFieldValue(dataRow, fieldKey);
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

        mkdirp('tmp', Meteor.bindEnvironment(function (err) {
            if (err) {
                console.log('Error creating tmp dir', err);
                futureResponse.throw(err);
            }
            else {
                var uuid = UUID.v4();
                var filePath = './tmp/' + uuid;
                workbook.writeToFile(filePath);

                temporaryFiles.importFile(filePath, {
                    _id: uuid,
                    filename: name + '.xlsx',
                    //contentType: 'application/octet-stream'
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }, function (err, file) {
                    if (err) {
                        futureResponse.throw(err);
                    } else {
                        temporaryFiles.update({_id: file._id}, {
                            $set: {
                                'metadata.owner': Meteor.userId()
                            }
                        });
                        futureResponse.return('/gridfs/temporaryFiles/' + file._id);
                        Meteor.setTimeout(function () {
                            console.log("Remove file " + file._id);
                            temporaryFiles.remove({_id: file._id});
                        }, 1800000);
                    }
                });
            }
        }));

        return futureResponse.wait();
    };

    Meteor.methods(methods);

};

Meteor.publish('temporaryFilesData',
    function (clientUserId) {
        if (clientUserId === this.userId) {
            return temporaryFiles.find({'metadata.owner': this.userId});
        } else {
            return null;
        }
    }
);






