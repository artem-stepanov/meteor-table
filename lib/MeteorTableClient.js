var resetCheckboxChecked = function (instance) {
    instance.anyChecked.set(false);
    var $table = instance.$(".meteor-table .meteor-table-table table");
    $table.find("input.checkboxes").each(function () {
        $(this).prop('checked', false);
    });
    $("body").removeClass("checkboxes-field-enabled");
};

var updateDbData = function (fieldName, fieldValue, instance) {
    instance = instance || Template.instance();
    var saveState = instance.data.settings.saveState || false;
    if (saveState === true) {
        var setUpdateField = "meteorTable." + instance.data.settings.subscribe + "." + fieldName;
        var setUpdate = {};
        setUpdate[setUpdateField] = fieldValue;
        Meteor.users.update({_id: Meteor.userId()}, {$set: setUpdate});
    }
};

var scrollUp = function () {
    var sectionTop = Template.instance().$(".meteor-table-table").offset().top - 60;
    $("html, body").animate({
        scrollTop: sectionTop
    }, "slow");
};

var hideFilters = function () {
    Template.instance().$(".meteor-table .filters-show").show();
    Template.instance().$(".meteor-table .filters-hide").hide();
};

var showFilters = function () {
    Template.instance().$(".meteor-table .filters-show").hide();
    Template.instance().$(".meteor-table .filters-hide").show();
};

if (window.JSON && !window.JSON.dateParser) {
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    var reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;

    JSON.dateParser = function (key, value) {
        if (typeof value === 'string') {
            var a = reISO.exec(value);
            if (a)
                return new Date(value);
            a = reMsAjax.exec(value);
            if (a) {
                var b = a[1].split(/[-+,.]/);
                return new Date(b[0] ? +b[0] : 0 - +b[1]);
            }
        }
        return value;
    };

}

Meteor.startup(function () {
    Meteor.subscribe('excelFilesData', Meteor.userId());
});

var updatePublication = function (context) {
    var newHandle;

    var publicationId = _.uniqueId();
    var newPublishedRows = new Mongo.Collection('meteor-table-rows-' + publicationId);
    context.nextPublicationId.set(publicationId);

    context.tableReady.set(false);

    var onReady = function () {
        if (publicationId === context.nextPublicationId.get()) {
            context.tableReady.set(true);
            if (context.firstLoad.get()) {
                context.firstLoad.set(false);
            }
            context.publicationId.set(publicationId);
            context.publishedRows = newPublishedRows;

            var oldHandle = context.handle;
            context.handle = newHandle;

            if (oldHandle) {
                oldHandle.stop();
            }
        } else {
            newHandle.stop();
        }
    };

    var onError = function (error) {
        console.log("MeteorTable subscription error: " + error);
    };

    newHandle = Meteor.subscribe(
        "meteor-table-" + context.data.settings.subscribe,
        publicationId,
        context.fields.get(),
        context.columnOrder.get(),
        context.rowPerPage.get(),
        (context.page.get() - 1) * context.rowPerPage.get(),
        context.sort.get(),
        context.sortOrder.get(),
        context.filters.get(),
        context.dataFilters.get(),
        context.selectorFilters.get(),
        context.dateFormatMoment,
        {onReady: onReady, onError: onError}
    );
};

Template.meteorTable.helpers({

    isCordova: function () {
        return Meteor.isCordova;
    },

    rowsData: function () {
        var params = MeteorTable.getParams(
            Template.instance().fields.get(),
            Template.instance().columnOrder.get(),
            0,
            0,
            Template.instance().sort.get(),
            Template.instance().sortOrder.get()
        );

        return Template.instance().publishedRows.find({
            "meteor-table-id": Template.instance().publicationId.get()
        }, params);
    },

    getPaginationArray: function () {
        var out = false;
        var pagesCount = Math.ceil(Counts.get('meteor-table-count-' + Template.instance().data.settings.subscribe) / Template.instance().rowPerPage.get());
        var currentPage = Template.instance().page.get();
        if (pagesCount > 1) {
            out = [];
            if (currentPage != 1) {
                out.push({'text': '<span aria-hidden="true">&laquo;</span>', 'page': currentPage - 1});
            }
            var pagesToShow = 5;
            if (pagesCount > pagesToShow) {
                var startPage = currentPage - Math.floor(pagesToShow / 2);
                if (startPage < 1) {
                    startPage = 1;
                }
                var endPage = startPage + pagesToShow - 1;
                if (endPage > pagesCount) {
                    endPage = pagesCount;
                    startPage = endPage - pagesToShow + 1;
                }
                if (startPage > 1) {
                    out.push({'text': '1', 'page': 1});
                }
                if (startPage > 2) {
                    out.push({'text': '...', 'page': null});
                }
                for (var i = startPage; i <= endPage; i++) {
                    var tmpPage = {'text': i, 'page': i};
                    if (i == currentPage) {
                        tmpPage['active'] = true;
                    }
                    out.push(tmpPage);
                }
                if (endPage < pagesCount - 1) {
                    out.push({'text': '...', 'page': null});
                }
                if (endPage < pagesCount) {
                    out.push({'text': pagesCount, 'page': pagesCount});
                }
            } else {
                for (i = 1; i <= pagesCount; i++) {
                    tmpPage = {'text': i, 'page': i};
                    if (i == currentPage) {
                        tmpPage['active'] = true;
                    }
                    out.push(tmpPage);
                }
            }
            if (currentPage != pagesCount) {
                out.push({'text': '<span aria-hidden="true">&raquo;</span>', 'page': currentPage + 1});
            }
        }
        return out;
    },
    totalCountRows: function () {
        return Counts.get('meteor-table-count-' + Template.instance().data.settings.subscribe);
    },
    showRowPerPage: function () {
        return Counts.get('meteor-table-count-' + Template.instance().data.settings.subscribe) > 10;
    },
    tableReady: function () {
        return Template.instance().tableReady.get();
    },
    rowPerPage: function (val) {
        return val == Template.instance().rowPerPage.get();
    },
    hideLoading: function (loadingWhere) {
        return Template.instance().tableReady.get() || Template.instance().loading.get() !== loadingWhere;
    },
    firstLoading: function () {
        return Template.instance().firstLoad.get() && !Template.instance().tableReady.get();
    },
    getColumns: function () {
        var fields = Template.instance().fields.get();
        var columnOrder = Template.instance().columnOrder.get();
        var fieldsReturn = [];
        _.each(columnOrder, function (key) {
            fieldsReturn.push(fields[key]);
        });
        return fieldsReturn;
    },
    getTitle: function () {
        if (_.isFunction(this.title)) {
            return this.title();
        }
        return this.title;
    },
    getNoSort: function () {
        return (this.noSort === true) ? 'no-sort' : '';
    },
    getValue: function () {
        var object = Template.parentData(1);
        var fieldKey = this.key;
        var value = MeteorTable.getFieldValue(object, fieldKey);
        var view = this.getView(this.name, fieldKey, value, object, Template.instance().dateFormatMoment);
        if ((_.has(view, "string") && view.string === "") || view === "") {
            return new Spacebars.SafeString("&nbsp;");
        }
        return view;
    },
    isShownColumn: function () {
        return _.contains(Template.instance().shownColumns.get(), this.name);
    },
    isSort: function () {
        return this.key == Template.instance().sort.get();
    },
    getSortOrder: function () {
        var sortOrder = Template.instance().sortOrder.get();
        return sortOrder ? 'fa-sort-' + sortOrder : false;
    },
    getSort: function () {
        var fields = Template.instance().fields.get();
        var field = _.findWhere(fields, {key: Template.instance().sort.get()});
        if (!field) {
            return "";
        }
        if (_.isFunction(field.title)) {
            return field.title();
        }
        return field.title;
    },
    getFilters: function () {
        return Template.instance().filters.get();
    },
    issetFilters: function () {
        return !_.isEmpty(Template.instance().filters.get());
    },
    getLabel: function (labelName) {
        var labels = {
            count: "Items",
            empty: "No data available",
            columns: "Columns",
            excel: "Download Excel",
            search: "Search",
            totalChecked: "Total checked",
            reset: "Reset",
            filters: "Filters"
        };
        var label = Template.instance().data.settings.labels || labels;
        label = _.has(label, labelName) ? label[labelName] : labels[labelName];
        if (_.isFunction(label)) {
            label = label();
        }
        return label;
    },
    getCheckboxes: function () {
        return Template.instance().data.checkboxesMethods.get();
    },
    isCheckboxesChecked: function () {
        return Template.instance().anyChecked.get();
    },
    getCountCheckboxesChecked: function () {
        return Template.instance().totalChecked.get();
    },
    getButtons: function () {
        return Template.instance().data.buttons.get();
    },
    isFullFilters: function () {
        return !_.isEmpty(Template.instance().selectorFilters.get());
    },
    isNoResponsiveTable: function () {
        return Template.instance().noResponsiveTable.get();
    }
});

Template.meteorTable.onCreated(function () {

    var context = this;
    var data = context.data;
    var settings = data.settings;

    if (!settings.subscribe) throw new Error("Missing 'subscribe' param");

    var db = {};
    if (Meteor.user() && !Meteor.loggingIn()) {
        var meteorTableDb = Meteor.users.findOne({_id: Meteor.userId()});
        if (_.has(meteorTableDb, 'meteorTable')) {
            if (_.has(meteorTableDb.meteorTable, settings.subscribe)) {
                db = meteorTableDb.meteorTable[settings.subscribe];
            }
        }
    }

    context.dateFormat = settings.dateFormat || "dd.mm.yyyy";
    context.dateFormatMoment = context.dateFormat.toUpperCase();
    context.noExcel = settings.noExcel || false;

    var noResponsiveTable = data.noResponsiveTable;
    context.noResponsiveTable = noResponsiveTable;

    var filters = data.filters;
    context.filters = filters;

    var dataFilters = new ReactiveVar(db.dataFilters || {});
    context.dataFilters = dataFilters;

    var selectorFilters = {};
    try {
        selectorFilters = JSON.parse(db.selectorFilters, JSON.dateParser);
    } catch (e) {
        selectorFilters = {};
    }
    selectorFilters = new ReactiveVar(selectorFilters);
    context.selectorFilters = selectorFilters;

    _.each(filters.get(), function (filter) {
        if (_.has(dataFilters.get(), filter.name)) {
            filter.value.set(dataFilters.get()[filter.name]);
        }
        if (filter.type == MeteorTable.FIELD_TYPE_DATE && filter.dateValidFromUntil === false) {
            var dataObjValue = {};
            if (_.has(dataFilters.get(), filter.name + "DateFrom")) {
                dataObjValue["DateFrom"] = dataFilters.get()[filter.name + "DateFrom"];
            }
            if (_.has(dataFilters.get(), filter.name + "DateTo")) {
                dataObjValue["DateTo"] = dataFilters.get()[filter.name + "DateTo"];
            }
            if (!_.isEmpty(dataObjValue)) {
                filter.value.set(dataObjValue);
            }
        }
    });

    var fields = data.fields;
    var tmpField = {};
    _.each(fields.get(), function (field) {
        tmpField[field.name] = field;
    });
    fields.set(tmpField);
    context.fields = fields;

    var columnOrder = new ReactiveVar([]);
    context.columnOrder = columnOrder;

    //default
    columnOrder.set(_.keys(fields.get()));

    if (!_.isUndefined(db.columnOrder)) {
        var columnsOrderUnion = _.compact(_.union(db.columnOrder, columnOrder.get()));
        columnsOrderUnion = _.compact(_.map(columnsOrderUnion, function (value) {
            if (!_.has(fields.get(), value)) {
                return "";
            }
            return value;
        }));
        columnOrder.set(columnsOrderUnion);
    }

    var shownColumns = new ReactiveVar([]);
    context.shownColumns = shownColumns;

    //default for shownColumns
    var shownColumnsArray = [];
    _.each(fields.get(), function (field, key) {
        if (!field.hidden) {
            shownColumnsArray.push(key);
        }
    });
    shownColumns.set(_.compact(shownColumnsArray));

    if (!_.isUndefined(db.shownColumns)) {
        var shownColumnsUnion = _.compact(db.shownColumns);
        shownColumnsUnion = _.compact(_.map(shownColumnsUnion, function (value) {
            if (!_.has(fields.get(), value)) {
                return "";
            }
            return value;
        }));
        shownColumns.set(shownColumnsUnion);
    }

    //current page
    var page = new ReactiveVar(Session.get('meteor-table-current-page-' + settings.subscribe) || 1);
    context.page = page;

    var rowPerPage = new ReactiveVar(10);
    context.rowPerPage = rowPerPage;

    if (_.isNumber(db.rowPerPage)) {
        rowPerPage.set(db.rowPerPage);
    }

    var loading = new ReactiveVar(false);
    context.loading = loading;

    var firstLoad = new ReactiveVar(true);
    context.firstLoad = firstLoad;

    var sort = new ReactiveVar(false);
    context.sort = sort;

    if (_.isString(db.sort)) {
        sort.set(db.sort);
    } else if (_.isString(settings.sort) && _.has(fields.get(), settings.sort)) {
        sort.set(settings.sort);
    }

    var sortOrder = new ReactiveVar(false);
    context.sortOrder = sortOrder;

    if (_.isString(db.sortOrder)) {
        sortOrder.set(db.sortOrder);
    } else if (_.isString(settings.sortOrder) && _.contains(['asc', 'desc'], settings.sortOrder)) {
        sortOrder.set(settings.sortOrder);
    }

    var anyChecked = new ReactiveVar(false);
    context.anyChecked = anyChecked;

    var tableReady = new ReactiveVar(false);
    context.tableReady = tableReady;

    context.selectedOptions = {};

    context.publicationId = new ReactiveVar();
    context.nextPublicationId = new ReactiveVar();
    context.publishedRows = new Mongo.Collection(null);

    var totalChecked = new ReactiveVar(0);
    context.totalChecked = totalChecked;

    context.autorun(function () {

        Session.set('meteor-table-current-page-' + settings.subscribe, page.get());
        updatePublication(context);

        var $loadingOpacity = $('.meteor-table-table .loading-opacity');
        var $meteorTable = $(".meteor-table-table table");
        if ($meteorTable.length > 0) {
            $loadingOpacity.height($meteorTable.height());
            $loadingOpacity.width($meteorTable.width());
        } else {
            $loadingOpacity.height(0);
            $loadingOpacity.width(0);
        }
    });

});

Template.meteorTable.onRendered(function () {
    var template = this;
    var columnsSetting = template.$(".meteor-table .hidden-column-button");
    columnsSetting.popover({
        placement: 'bottom',
        html: true,
        trigger: 'click',
        content: function () {
            return template.$(".hidden-column-body").html();
        }
    });

    columnsSetting.on('inserted.bs.popover', function () {
        var listColumns = $(".meteor-table .list-columns");
        listColumns.sortable({
            out: function (event, ui) {
                var columnNames = listColumns.sortable("toArray", {attribute: "data-column-name"});
                template.columnOrder.set(columnNames);
                updateDbData("columnOrder", columnNames, template);
                resetCheckboxChecked.call(this, template);
            }
        });
        listColumns.disableSelection();
        _.each(template.shownColumns.get(), function (columnName) {
            var listColumnItem = template.$(".meteor-table .list-columns input[data-column-name='" + columnName + "']");
            listColumnItem.prop("checked", true);
        });
    });
    $('body').on('click', function (e) {
        $('[data-toggle="popover"]').each(function () {
            if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && template.$('.popover').has(e.target).length === 0) {
                $(this).popover('hide');
            }
        });
    });
    if (!Meteor.isCordova) {
        template.$('.meteor-table .datepicker').datepicker({
            format: template.dateFormat,
            language: i18n.getLanguage(),
            weekStart: 1,
            autoclose: true,
            todayHighlight: true,
            calendarWeeks: true
        });
    } else {
        template.$('.meteor-table input.cordova-datepicker').on('click', function (e) {
            e.preventDefault();
            Keyboard.hide();
            var $input = $(e.target);
            var val = $input.val();
            var dateDefault = val != "" ? moment(val, template.dateFormatMoment).toDate() : new Date();
            var options = {
                date: dateDefault,
                mode: 'date'
            };
            datePicker.show(options, function (date) {
                if (date === undefined) {
                    $input.val("");
                } else {
                    $input.val(moment(date).format(template.dateFormatMoment));
                }
            });
        });
    }

    this.autorun(function () {
        if (i18n.getLanguage() && !Meteor.isCordova) {
            var $select = template.$(".meteor-table select.meteor-table-select2");
            var selectedOptions = Template.instance().selectedOptions;
            template.$('.select2').each(function (i, item) {
                $(item).remove();
            });
            $select.select2({width: "100%"});
            if (!_.isEmpty(selectedOptions)) {
                $select.each(function (i, item) {
                    if (_.has(selectedOptions, $(item).attr("name"))) {
                        $(item).select2('val', selectedOptions[$(item).attr("name")]);
                    }
                });
            }
        }
    });

});

Template.meteorTable.events({
    'click .pagination a': function (event) {
        if (Template.instance().tableReady.get()) {
            var loadPage = $(event.currentTarget).attr("data-page");
            if (!_.isUndefined(loadPage)) {
                Template.instance().loading.set('page');
                scrollUp();
                Template.instance().page.set(parseInt(loadPage));
            }
            resetCheckboxChecked.call(this, Template.instance());
        }
        hideFilters();
    },
    'click .rowPerPage button': function (event) {
        if (Template.instance().tableReady.get()) {
            var row = $(event.currentTarget).attr("data-row");
            Template.instance().page.set(1);
            Template.instance().rowPerPage.set(parseInt(row));
            Template.instance().loading.set('rowPerPage');
            updateDbData("rowPerPage", Template.instance().rowPerPage.get());
            resetCheckboxChecked.call(this, Template.instance());
        }
        hideFilters();
    },
    'change .popover .list-columns input': function (event, template) {
        var shownColumn = [];
        template.$(".meteor-table .popover .list-columns input:checked").each(function () {
            var column = $(this).attr("data-column-name");
            shownColumn.push(column);
        });
        Template.instance().shownColumns.set(shownColumn);
        updateDbData("shownColumns", shownColumn);
    },
    'click .meteor-table-table th': function (event) {
        if (!$(event.currentTarget).hasClass("no-sort")) {
            var column = $(event.currentTarget).attr("data-column-name");
            var currentSort = Template.instance().sort.get();
            var fields = Template.instance().fields.get();
            var sort = fields[column].key;
            var sortOrder = "asc";
            if (sort == currentSort) {
                var currentSortOrder = Template.instance().sortOrder.get();
                if (currentSortOrder == "asc") {
                    sortOrder = "desc";
                } else if (currentSortOrder == "desc") {
                    sort = false;
                    sortOrder = false;
                }
            }
            Template.instance().sort.set(sort);
            Template.instance().sortOrder.set(sortOrder);
            Template.instance().loading.set('sort');
            updateDbData("sort", sort);
            updateDbData("sortOrder", sortOrder);
            resetCheckboxChecked.call(this, Template.instance());
        }
        if ($(event.target).closest("th:has(input.checkboxes)").length) {
            var checkbox = $(event.target).closest("th").find("input.checkboxes");
            var value = !checkbox.is(':checked');
            value = !$(event.target).is("input.checkboxes") ? value : !value;
            checkbox.prop('checked', value);

            var $table = $(event.target).closest("table");
            $table.find("td input.checkboxes").each(function () {
                $(this).prop('checked', value);
            });
            Template.instance().anyChecked.set(value);
            var totalChecked = $table.find("td input.checkboxes:checked").length;
            Template.instance().totalChecked.set(totalChecked);

            if (value) {
                $("body").addClass("checkboxes-field-enabled");
            } else {
                $("body").removeClass("checkboxes-field-enabled");
            }
        }
    },
    'click .mobile-sort .change-sort-order': function () {
        var currentSortOrder = Template.instance().sortOrder.get();
        var sortOrder = currentSortOrder == "asc" ? "desc" : "asc";
        Template.instance().sortOrder.set(sortOrder);
        Template.instance().loading.set('sort');
        updateDbData("sortOrder", sortOrder);
        resetCheckboxChecked.call(this, Template.instance());
    },
    'click .mobile-sort .dropdown-menu li': function (event) {
        var currentSort = Template.instance().sort.get();
        var column = $(event.currentTarget).attr("data-column-name");
        var fields = Template.instance().fields.get();
        var sort = false;
        if (_.has(fields, column)) {
            sort = fields[column].key;
        }
        if (currentSort != sort) {
            var sortOrder = sort ? "asc" : false;
            Template.instance().sort.set(sort);
            Template.instance().sortOrder.set(sortOrder);
            Template.instance().loading.set('sort');
            updateDbData("sort", sort);
            updateDbData("sortOrder", sortOrder);
            resetCheckboxChecked.call(this, Template.instance());
        }
    },
    'click .meteor-table-filters .meteor-table-submit': function (e) {
        e.preventDefault();
        var $form = $(".meteor-table .meteor-table-filters");

        var filetrs = Template.instance().filters.get();
        _.each(filetrs, function (field, key) {
            if (field.filterBeforeSubmitFunc) {
                field.filterBeforeSubmitFunc.call(this, $form);
            }
        });

        var dataFilters = $form.serializeObject();

        var selectorFilters = MeteorTable.getSelectors({}, filetrs, dataFilters, Template.instance().dateFormatMoment);
        Template.instance().selectorFilters.set(selectorFilters);

        Template.instance().dataFilters.set(dataFilters);
        Template.instance().loading.set('search');
        Template.instance().page.set(1);
        updateDbData("dataFilters", dataFilters);
        updateDbData("selectorFilters", JSON.stringify(selectorFilters));
        resetCheckboxChecked.call(this, Template.instance());
        hideFilters();
    },
    'click .excel-download': function (event, template) {
        template.$(event.target).prop("disabled", true);
        var subscribe = Template.instance().data.settings.subscribe;
        var fields = {};
        _.each(Template.instance().fields.get(), function (field, key) {
            if (_.isFunction(field.title)) {
                field.title = field.title();
            }
            fields[key] = field;
        });
        Meteor.call(
            'meteorTableDownloadExcelFile' + subscribe,
            fields,
            Template.instance().columnOrder.get(),
            Template.instance().shownColumns.get(),
            Template.instance().rowPerPage.get(),
            (Template.instance().page.get() - 1) * Template.instance().rowPerPage.get(),
            Template.instance().sort.get(),
            Template.instance().sortOrder.get(),
            Template.instance().filters.get(),
            Template.instance().dataFilters.get(),
            Template.instance().selectorFilters.get(),
            Template.instance().dateFormatMoment,
            function (err, fileUrl) {
                template.$(event.target).prop("disabled", false);

                if (Meteor.isCordova) {
                    window.open(fileUrl, "_system");
                } else {
                    var link = document.createElement("a");
                    if (!(BrowserDetect.OS == 'iPhone/iPod' && BrowserDetect.browser == 'Safari')) {
                        link.target = '_blank';
                    }
                    link.href = fileUrl;
                    link.download = subscribe + '.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            });
    },
    'change .meteor-table-select2': function (event, template) {
        var $select = template.$(".meteor-table select.meteor-table-select2");
        $select.each(function (i, item) {
            Template.instance().selectedOptions[$(item).attr("name")] = $(item).val();
        });
    },
    'click .meteor-table-table td': function (e) {
        if (!$(e.target).is("input.checkboxes")) {
            var $checkbox = $(e.target).closest("tr").find("input.checkboxes");
            $checkbox.prop('checked', !$checkbox.is(':checked'));
        }

        var $table = $(e.target).closest("table");
        var $thch = $table.find("th input.checkboxes");
        var chs = $table.find("td input.checkboxes").length;
        var chschd = $table.find("td input.checkboxes:checked").length;

        if (chs == chschd) {
            $thch.prop('checked', true);
        }
        if (chschd < chs) {
            $thch.prop('checked', false);
        }

        Template.instance().anyChecked.set(chschd > 0);

        if (chschd > 0) {
            $("body").addClass("checkboxes-field-enabled");
        } else {
            $("body").removeClass("checkboxes-field-enabled");
        }

        var totalChecked = $table.find("td input.checkboxes:checked").length;
        Template.instance().totalChecked.set(totalChecked);
    },
    'click .navbar-checkboxes-buttons button': function (event, template) {
        template.$(event.target).prop("disabled", true);
        var name = $(event.currentTarget).attr("data-func-name");
        var ids = [];
        $(event.currentTarget).closest(".meteor-table").find(".meteor-table-table table td input.checkboxes:checked").each(function () {
            ids.push($(this).attr("data-id"));
        });
        var method = _.findWhere(Template.instance().data.checkboxesMethods.get(), {name: name});
        if (!_.isUndefined(method) && _.has(method, 'func') && _.isFunction(method.func)) {
            method['func'].call(Template.instance(), ids, function () {
                template.$(event.target).prop("disabled", false);
            });
        }
    },
    'click .buttons button': function (event, template) {
        template.$(event.target).prop("disabled", true);
        var name = $(event.currentTarget).attr("data-func-name");
        var method = _.findWhere(Template.instance().data.buttons.get(), {name: name});
        if (!_.isUndefined(method) && _.has(method, 'func') && _.isFunction(method.func)) {
            method['func'].call(Template.instance(), function () {
                template.$(event.target).prop("disabled", false);
            });
        }
    },
    'click .link-reset': function (event, template) {
        var filters = Template.instance().filters.get();
        var $filterForm = $(event.currentTarget).closest(".meteor-table").find(".meteor-table-filters");
        _.each(filters, function (field) {
            switch (field.type) {
                case MeteorTable.FIELD_TYPE_TEXT:
                    $filterForm.find("textarea[name='" + field.name + "']").val("");
                    break;
                case MeteorTable.FIELD_TYPE_DATE:
                    if (field.dateValidFromUntil !== false) {
                        $filterForm.find("input[name='" + field.name + "']").val("");
                    } else {
                        $filterForm.find("input[name='" + field.name + "DateFrom']").val("");
                        $filterForm.find("input[name='" + field.name + "DateTo']").val("");
                    }
                    break;
                case MeteorTable.FIELD_TYPE_SELECT:
                    if (Meteor.isCordova) {
                        $filterForm.find("select.meteor-table-select2[name='" + field.name + "']").val("");
                    } else {
                        $filterForm.find("select.meteor-table-select2[name='" + field.name + "']").select2("val", "");
                    }
                    break;
                case MeteorTable.FIELD_TYPE_STRING:
                    $filterForm.find("input[name='" + field.name + "']").val("");
                    break;
            }
            if (field.filterResetFunc) {
                field.filterResetFunc.call(this);
            }
        });
    },
    "click .hide-filters": function (event, template) {
        showFilters();
    }
});
