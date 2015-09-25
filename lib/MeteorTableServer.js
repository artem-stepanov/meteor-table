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


var getExcelValue = function (value, type, options) {
    if (_.isNull(value)) {
        return "";
    }
    switch (type) {
        case MeteorTableParams.METEOR_TABLE_FIELD_TYPE_DATE:
            if (moment(value).isValid()) {
                return value;
            }
            return "";
        case MeteorTableParams.METEOR_TABLE_FIELD_TYPE_SELECT:
            if (!_.isUndefined(options[value])) {
                return options[value];
            }
            return value;
        //case MeteorTableParams.METEOR_TABLE_FIELD_TYPE_CHECKBOX:
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

    Meteor.publish("meteor-table-" + name, function (publicationId, fields, columnOrder, limit, skip, sort, sortOrder, filters, dataFilters, dateFormatMoment) {

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

        selector = MeteorTableParams.getSelectors(selector, filters, dataFilters, dateFormatMoment);
        var params = MeteorTableParams.getParams(fields, columnOrder, limit, skip, sort, sortOrder);


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



        var self = this;
        var cursor = collection.find(selector, params);

        var getRow = function (row, index) {
            return _.extend({
                "meteor-table-id": publicationId,
                "meteor-table-sort": index
            }, row);
        };

        var getRows = function () {
            return _.map(cursor.fetch(), getRow);
        };
        var rows = {};
        _.each(getRows(), function (row) {
            rows[row._id] = row;
        });

        var updateRows = function () {
            var newRows = getRows();
            _.each(newRows, function (row, index) {
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

        _.each(rows, function (row) {
            self.added("meteor-table-rows-" + publicationId, row._id, row);
        });

        var initializing = true;

        var handle = cursor.observeChanges({
            added: function (id, fields) {
                if (!initializing) {
                    updateRows();
                }
            },
            removed: function (id, fields) {
                self.removed("meteor-table-rows-" + publicationId, id);
                delete rows[id];
                updateRows();
            },
            changed: function (id, fields) {
                updateRows();
            }
        });
        initializing = false;

        self.ready();

        self.onStop(function () {
            handle.stop();
        });

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
        var columns = [];
        _.each(columnsOrderExcel, function(value){
            if (_.contains(shownColumnsExcel, value)) {
                columns.push(value);
            }
        });

        _.each(columns, function (column) {
            worksheet.writeToCell(0, i, fieldsExcel[column].title);
            i++;
        });

        selector = MeteorTableParams.getSelectors(selector, filtersExcel, dataFiltersExcel, dateFormatMomentExcel);
        var params = MeteorTableParams.getParams(fieldsExcel, columns, limitExcel, skipExcel, sortExcel, sortOrderExcel);
        params.limit = 0;
        params.skip = 0;

        var row = 1;
        collection.find(selector, params).forEach(function (dataRow) {
            var i = 0;
            _.each(columns, function (column) {
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






