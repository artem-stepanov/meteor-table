MeteorTable = {};

MeteorTable.init = function (settings) {
    var that = this;

    that.settings = settings;

    that.filters = new ReactiveVar(settings.filters || {});
    that.setFilters = function (settingsFilters) {
        that.filters.set(settingsFilters);
    };

    that.fields = new ReactiveVar(settings.fields || {});
    that.setFields = function (settingsFields) {
        that.fields.set(settingsFields);
    };

    //checkboxesMethods {'id': {'title': '', 'func': function(array ids) {} }}
    that.checkboxesMethods = new ReactiveVar(settings.checkboxesMethods || false);
    that.setCheckboxesMethods = function (val) {
        that.checkboxesMethods.set(val);
    };

    //buttons {'id': {'title': '', 'func': function(array ids) {} }}
    that.buttons = new ReactiveVar(settings.buttons || false);
    that.setButtons = function (val) {
        that.buttons.set(val);
    };

    that.noResponsiveTable = new ReactiveVar(settings.noResponsiveTable || false);
    that.setNoResponsiveTable = function (val) {
        that.noResponsiveTable.set(val);
    };
};

MeteorTable.FIELD_TYPE_STRING = 1;
MeteorTable.FIELD_TYPE_TEXT = 2;
MeteorTable.FIELD_TYPE_DATE = 3;
MeteorTable.FIELD_TYPE_SELECT = 4;
//MeteorTable.FIELD_TYPE_CHECKBOX = 5;

MeteorTable.field = function (name, type, params) {

    this.name = name;
    this.type = type;

    params = _.isUndefined(params) ? {} : params;

    var value = new ReactiveVar(_.has(params, "value") ? params.value : null);
    this.value = value;

    var getParam = function (paramName) {
        var param = _.has(params, paramName) ? params[paramName] : false;
        if (_.isFunction(param)) {
            param = param(value);
        } else if (param instanceof ReactiveVar) {
            param = param.get();
        }
        return param;
    };

    this.key = getParam("key") || name;
    this.title = _.has(params, 'title') ? params['title'] : name;

    //this.selectorView = getParam("selectorView");
    this.selectorFilter = _.has(params, 'selectorFilter') ? params['selectorFilter'] : false;

    this.tplView = getParam("tplView");
    this.tplInput = getParam("tplInput");
    this.hidden = getParam("hidden");
    this.noSort = getParam("noSort");
    this.dateValidFromUntil = getParam("dateValidFromUntil");

    this.filterResetFunc = _.has(params, 'filterResetFunc') ? params['filterResetFunc'] : false;
    this.filterBeforeSubmitFunc = _.has(params, 'filterBeforeSubmitFunc') ? params['filterBeforeSubmitFunc'] : false;

    this.isViewTpl = function () {
        return this.tplView !== false;
    };

    this.getView = function (columnName, fieldKey, currentValue, object, dateFormatMoment) {

        if (_.has(params, 'htmlView')) {
            if (params.htmlView) {
                var htmlView;
                if (_.isFunction(params.htmlView)) {
                    htmlView = params.htmlView.call(this, columnName, fieldKey, currentValue, object, dateFormatMoment);
                } else if (params.htmlView instanceof ReactiveVar) {
                    htmlView = params.htmlView.get();
                }
                if (htmlView !== false) {
                    return htmlView;
                }
            }
        }

        if (_.isNull(currentValue) || currentValue === "") {
            return new Spacebars.SafeString("&nbsp;");
        }

        switch (this.type) {
            case MeteorTable.FIELD_TYPE_DATE:
                var m = moment(currentValue);
                if (m.isValid()) {
                    return new Spacebars.SafeString(m.format(dateFormatMoment));
                }
                return new Spacebars.SafeString("&nbsp;");
            case MeteorTable.FIELD_TYPE_SELECT:
                if (!_.isUndefined(params.options[currentValue])) {
                    return new Spacebars.SafeString(params.options[currentValue]);
                }
                return new Spacebars.SafeString(currentValue);
            //case MeteorTable.FIELD_TYPE_CHECKBOX:
            //    return new Spacebars.SafeString(currentValue ? 'Yes' : 'No');
            default:
                return new Spacebars.SafeString(currentValue);
        }
    };

    // var htmlInput = getParam("htmlInput");
    this.isInputTpl = function () {
        return this.tplInput !== false;
    };
    this.getInput = function () {

        // if (htmlInput && _.isFunction(htmlInput)) {
        //     return htmlInput(data);
        // }

        var filterValue = value.get() || "";
        if (_.has(params, 'htmlInput')) {
            if (params.htmlInput) {
                var htmlInput;
                if (_.isFunction(params.htmlInput)) {
                    htmlInput = params.htmlInput.call(this, filterValue);
                } else if (params.htmlView instanceof ReactiveVar) {
                    htmlInput = params.htmlInput.get();
                }
                if (htmlInput !== false) {
                    return htmlInput;
                }
            }
        }

        switch (this.type) {
            case MeteorTable.FIELD_TYPE_TEXT:
                return new Spacebars.SafeString('<textarea class="form-control" name="' + this.name + '">' + filterValue + '</textarea>');
            case MeteorTable.FIELD_TYPE_DATE:
                var html;
                if (this.dateValidFromUntil !== false) {
                    html = '<input type="text" class="form-control datepicker cordova-datepicker" name="' + this.name + '" value="' + filterValue + '">';
                } else {
                    html = '<div class="input-daterange input-group datepicker">';
                    var from = (filterValue) ? filterValue['DateFrom'] || "" : "";
                    html += '<input type="text" class="input-sm  form-control cordova-datepicker" name="' + this.name + 'DateFrom" value="' + from + '">';
                    html += '<span class="input-group-addon">&ndash;</span>';
                    var to = (filterValue) ? filterValue['DateTo'] || "" : "";
                    html += '<input type="text" class="input-sm  form-control cordova-datepicker" name="' + this.name + 'DateTo" value="' + to + '">';
                    html += '</div>';
                }
                return new Spacebars.SafeString(html);
            case MeteorTable.FIELD_TYPE_SELECT:
                var select = '<select class="meteor-table-select2" name="' + this.name + '">';
                var options = getParam("options") || {};
                select += '<option value="">..</option>';
                _.each(options, function (option) {
                    var selected = option.value == filterValue && filterValue !== "" ? ' selected' : '';
                    var title = _.isFunction(option.title) ? option.title.call(this) : option.title;
                    select += '<option value="' + option.value + '"' + selected + '>' + title + '</option>';
                });
                select += '</select>';
                return new Spacebars.SafeString(select);
            default:
                return new Spacebars.SafeString('<input type="text" class="form-control" name="' + this.name + '" value="' + filterValue + '">');
        }
    };

};

MeteorTable.excelFiles = new FileCollection('excelFiles',
    {
        resumable: false,
        http: [
            {
                method: 'get',
                path: '/:_id/:_filename',
                lookup: function (params) {
                    return {$and: [{_id: params._id}, {filename: params._filename}]};
                }
            }
        ]
    }
);

MeteorTable.getFieldValue = function (obj, field) {
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

MeteorTable.isNumeric = function (input) {
    var RE = /^-?(0|INF|(0[1-7][0-7]*)|(0x[0-9a-fA-F]+)|((0|[1-9][0-9]*|(?=[\.,]))([\.,][0-9]+)?([eE]-?\d+)?))$/;
    return (RE.test(input));
};

MeteorTable.getSelectors = function (selector, filters, dataFilters, dateFormatMoment) {
    var additionalSelector = [];
    _.each(filters, function (filter) {

        if (filter.selectorFilter !== false && _.isFunction(filter.selectorFilter)) {
            var selectorFromParam = filter.selectorFilter(dataFilters[filter.name], dataFilters);
            if (!_.isEmpty(selectorFromParam)) {
                additionalSelector.push(selectorFromParam);
            }
        } else {
            var elem = {};
            if (filter.type == MeteorTable.FIELD_TYPE_DATE) {

                if (filter.dateValidFromUntil !== false) {

                    if (_.isObject(filter.dateValidFromUntil)) {
                        if (_.has(filter.dateValidFromUntil, 'from') && _.has(filter.dateValidFromUntil, 'until')) {
                            if (_.has(dataFilters, filter.name)) {
                                var date = dataFilters[filter.name];
                                if (date !== '') {
                                    date = moment(date, dateFormatMoment);
                                    var elemFrom;
                                    elemFrom[filter.dateValidFromUntil.from] = {'$gte': date.toDate()};
                                    var elemUntil;
                                    elemUntil[filter.dateValidFromUntil.until] = {'$lte': date.toDate()};
                                    additionalSelector.push({'$and': [elemFrom, elemUntil]});
                                }
                            }
                        }
                    }

                } else {
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
                }
            } else if (_.has(dataFilters, filter.name)) {
                var value = dataFilters[filter.name];
                if (value !== "") {
                    if (_.isString(value)) {
                        value = value.split("\r\n");
                    }
                    var keys = [];
                    if (_.isArray(filter.key)) {
                        keys = filter.key;
                    } else {
                        keys = [filter.key];
                    }
                    var orselector = [];
                    _.each(value, function (curValue) {
                        curValue = curValue.trim();
                        if (curValue !== "") {
                            if (filter.type == MeteorTable.FIELD_TYPE_STRING || filter.type == MeteorTable.FIELD_TYPE_TEXT) {
                                curValue = curValue.toString();
                            } else {
                                curValue = MeteorTable.isNumeric(curValue) ? parseFloat(curValue) : curValue;
                            }
                            _.each(keys, function (key) {
                                var orelem = {};
                                if (filter.type == MeteorTable.FIELD_TYPE_SELECT) {
                                    orelem[key] = curValue;
                                } else {
                                    orelem[key] = {$regex: curValue, $options: "i"};
                                }
                                orselector.push(orelem);
                            });
                        }
                    });
                    if (!_.isEmpty(orselector)) {
                        if (orselector.length == 1) {
                            elem = orselector.shift();
                        } else {
                            elem['$or'] = orselector;
                        }
                        additionalSelector.push(elem);
                    }
                }
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

MeteorTable.getParams = function (fields, columnOrder, limit, skip, sort, sortOrder) {
    var params = {limit: limit, skip: skip};
    if (sort && sortOrder) {
        params.sort = [[sort, sortOrder]];
    }
    //var fieldsReturn = {};
    //_.each(columnOrder, function (column) {
    //    fieldsReturn[fields[column].key] = 1;
    //});
    //params.fields = fieldsReturn;
    return params;
};





