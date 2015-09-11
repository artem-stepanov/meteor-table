METEOR_TABLE_FIELD_TYPE_STRING = 1;
METEOR_TABLE_FIELD_TYPE_TEXT = 2;
METEOR_TABLE_FIELD_TYPE_DATE = 3;
METEOR_TABLE_FIELD_TYPE_SELECT = 4;
//METEOR_TABLE_FIELD_TYPE_CHECKBOX = 5;

MeteorTable = function (settings) {
    this.settings = settings;
};

MeteorTableField = function (name, type, params) {

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
    //this.selectorFilter = getParam("selectorFilter");

    this.tplView = getParam("tplView");
    this.tplInput = getParam("tplInput");

    this.hidden = getParam("hidden");

    this.isViewTpl = function () {
        return this.tplView && _.isObject(this.tplView) && this.tplView instanceof Blaze.Template;
    };

    this.getView = function (columnName, fieldKey, currentValue, object, dateFormatMoment) {
        if (_.isNull(currentValue)) {
            return "";
        }
        if (_.has(params, 'htmlView')) {
            if (params.htmlView) {
                var htmlView;
                if (_.isFunction(params.htmlView)) {
                    htmlView = params.htmlView.call(this, columnName, fieldKey, currentValue, object, dateFormatMoment);
                } else if (param instanceof ReactiveVar) {
                    htmlView = param.get();
                }
                if (htmlView !== false) {
                    return htmlView;
                }
            }
        }
        switch (this.type) {
            case METEOR_TABLE_FIELD_TYPE_DATE:
                var m = moment(currentValue);
                if (m.isValid()) {
                    return new Spacebars.SafeString(m.format(dateFormatMoment));
                }
                return "";
            case METEOR_TABLE_FIELD_TYPE_SELECT:
                if (!_.isUndefined(params.options[currentValue])) {
                    return new Spacebars.SafeString(params.options[currentValue]);
                }
                return new Spacebars.SafeString(currentValue);
            //case METEOR_TABLE_FIELD_TYPE_CHECKBOX:
            //    return new Spacebars.SafeString(currentValue ? 'Yes' : 'No');
            default:
                return new Spacebars.SafeString(currentValue);
        }
    };

    var htmlInput = getParam("htmlInput");
    this.isInputTpl = function () {
        return this.tplInput && _.isObject(this.tplInput) && this.tplInput instanceof Blaze.Template;
    };
    this.getInput = function () {
        if (htmlInput && _.isFunction(htmlInput)) {
            return htmlInput(data);
        }
        var filterValue = value.get() || "";
        switch (this.type) {
            case METEOR_TABLE_FIELD_TYPE_TEXT:
                return new Spacebars.SafeString('<textarea class="form-control" name="' + this.name + '">' + filterValue + '</textarea>');
            case METEOR_TABLE_FIELD_TYPE_DATE:
                var html = '<div class="input-daterange input-group" id="datepicker">';
                var from = (filterValue) ? filterValue['DateFrom'] || "" : "";
                html += '<input type="text" class="input-sm  form-control" name="' + this.name + 'DateFrom" value="' + from + '">';
                html += '<span class="input-group-addon">&ndash;</span>';
                var to = (filterValue) ? filterValue['DateTo'] || "" : "";
                html += '<input type="text" class="input-sm  form-control" name="' + this.name + 'DateTo" value="' + to + '">';
                html += '</div>';
                return new Spacebars.SafeString(html);
            case METEOR_TABLE_FIELD_TYPE_SELECT:
                var select = '<select class="meteor-table-select2" name="' + this.name + '">';
                var options = getParam("options") || {};
                select += '<option value="">..</option>';
                _.each(options, function (option) {
                    var selected = option.value == filterValue ? ' selected' : '';
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

temporaryFiles = new FileCollection('temporaryFiles',
    {
        resumable: false,
        http: [
            {
                method: 'get',
                path: '/:_id',
                lookup: function (params) {
                    return {_id: params._id};
                }
            }
        ]
    }
);

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





