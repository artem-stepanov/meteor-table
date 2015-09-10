var updateDbData = function (fieldName, fieldValue, instance) {
    instance = instance || Template.instance();
    var setUpdateField = "meteorTable." + instance.data.settings.subscribe + "." + fieldName;
    var setUpdate = {};
    setUpdate[setUpdateField] = fieldValue;
    Meteor.users.update({_id: Meteor.userId()}, {$set: setUpdate});
};

Template.meteorTable.helpers({

    rowsData: function () {
        var params = {};
        var sort = Template.instance().sort.get();
        var sortOrder = Template.instance().sortOrder.get();
        if (sortOrder) {
            params.sort = [[sort, sortOrder]];
        }
        return Template.instance().data.settings.collections.find({}, params);
    },

    getPaginationArray: function () {
        var out = false;
        var pagesCount = Math.ceil(Counts.get('meteor-table-count-' + Template.instance().data.settings.subscribe) / Template.instance().rowPerPage.get());
        var currentPage = Template.instance().page.get();
        if (pagesCount > 1) //Если страниц больше чем одна, выводим список страниц
        {
            out = [];
            //Если это не первая страница, вывести ссылку на предыдущую
            if (currentPage != 1) {
                out.push({'text': '<span aria-hidden="true">&laquo;</span>', 'page': currentPage - 1});
            }
            var pagesToShow = 5;
            if (pagesCount > pagesToShow) {
                //Страниц больше, чем положено выводить в линейку в блоке Pages
                //Поэтмоу разбиваем...
                //Весь интервал pagesToShow делится пополам. Слева от currentPage выводится половина и справа выводится половина
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
                    //Выведем ссылку на первую страницу
                    out.push({'text': '1', 'page': 1});
                }
                if (startPage > 2) {
                    //Выведем разделитель
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
                    //Выведем разделитель
                    out.push({'text': '...', 'page': null});
                }
                if (endPage < pagesCount) {
                    //Выведем ссылку на последнюю страницу
                    out.push({'text': pagesCount, 'page': pagesCount});
                }
            } else {
                //Если число страниц умещается в один пажинатор, просто выведем их все
                for (i = 1; i <= pagesCount; i++) {
                    tmpPage = {'text': i, 'page': i};
                    if (i == currentPage) {
                        tmpPage['active'] = true;
                    }
                    out.push(tmpPage);
                }
            }
            //Выведем ссылку на следующую страницу Next
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
        return Template.instance().columnOrder.get();
    },
    getTitle: function (columnName) {
        var title = Template.instance().fields.get()[columnName].title;
        if (_.isFunction(title)) {
            return title();
        }
        return title;
    },
    getValue: function (columnName) {
        var object = Template.parentData(1);
        var fieldKey = Template.instance().fields.get()[columnName].key;
        var value = getFieldValue(object, fieldKey);
        return Template.instance().fields.get()[columnName].getView(columnName, fieldKey, value, object, Template.instance().dateFormatMoment);
    },
    isShownColumn: function (columnName) {
        return _.contains(Template.instance().shownColumns.get(), columnName);
    },
    isSort: function (sort) {
        var fields = Template.instance().fields.get();
        return fields[sort].key == Template.instance().sort.get();
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
    getCountTitle: function () {
        return Template.instance().data.settings.countTitle() || "Items";
    }
});

Template.meteorTable.onCreated(function () {

    //проверка на обязательные поля: collections, subscribe, fields
    if (!this.data.settings.collections) throw new Error("Missing 'collections' param");
    if (!this.data.settings.subscribe) throw new Error("Missing 'subscribe' param");
    if (!this.data.settings.fields) throw new Error("Missing 'fields' param");

    var db = {};
    try {
        db = Meteor.users.findOne({_id: Meteor.userId()}).meteorTable[this.data.settings.subscribe];
    } catch (e) {

    }

    this.dateFormat = this.data.settings.dateFormat || "dd.mm.yyyy";
    this.dateFormatMoment = this.dateFormat.toUpperCase();

    var filters = new ReactiveVar(this.data.settings.filters || {});
    this.filters = filters;

    var dataFilters = new ReactiveVar(db.dataFilters || {});
    this.dataFilters = dataFilters;

    //установка значений фильтров
    _.each(filters.get(), function (filter) {
        if (_.has(dataFilters.get(), filter.name)) {
            filter.value.set(dataFilters.get()[filter.name]);
        }
        if (filter.type == METEOR_TABLE_FIELD_TYPE_DATE) {
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

    var fields = new ReactiveVar(this.data.settings.fields || {});
    this.fields = fields;

    var columnOrder = new ReactiveVar([]);
    this.columnOrder = columnOrder;

    //default
    columnOrder.set(_.keys(Template.instance().fields.get()));

    var shownColumns = new ReactiveVar([]);
    this.shownColumns = shownColumns;

    //устанавливаем заначения по умолчанию для shownColumns
    var shownColumnsArray = [];
    _.each(fields.get(), function (field, key) {
        if (!field.hidden) {
            shownColumnsArray.push(key);
        }
    });
    shownColumns.set(shownColumnsArray);

    //current page
    var page = new ReactiveVar(Session.get('meteor-table-current-page-' + this.data.settings.subscribe) || 1);
    this.page = page;

    var rowPerPage = new ReactiveVar(10);
    this.rowPerPage = rowPerPage;

    if (_.isNumber(db.rowPerPage)) {
        rowPerPage.set(db.rowPerPage);
    }

    var loading = new ReactiveVar(false);
    this.loading = loading;

    var firstLoad = new ReactiveVar(true);
    this.firstLoad = firstLoad;

    var sort = new ReactiveVar(false);
    this.sort = sort;

    if (_.isString(db.sort)) {
        sort.set(db.sort);
    }

    var sortOrder = new ReactiveVar(false);
    this.sortOrder = sortOrder;

    if (_.isString(db.sortOrder)) {
        sortOrder.set(db.sortOrder);
    }

    var tableReady = new ReactiveVar(false);
    this.tableReady = tableReady;

    var sub;

    //tracker
    this.autorun(function () {

        var db = Meteor.users.findOne({_id: Meteor.userId()}).meteorTable;
        if (!_.isUndefined(db)) {
            if (_.has(db, Template.instance().data.settings.subscribe)) {
                db = db[Template.instance().data.settings.subscribe];
                if (!_.isUndefined(db.shownColumns)) {
                    shownColumns.set(db.shownColumns);
                }
                if (!_.isUndefined(db.columnOrder)) {
                    columnOrder.set(db.columnOrder);
                }
            }
        }

        Session.set('meteor-table-current-page-' + Template.instance().data.settings.subscribe, page.get());

        sub = Meteor.subscribe(
            "meteor-table-" + Template.instance().data.settings.subscribe,
            fields.get(),
            columnOrder.get(),
            rowPerPage.get(),
            (page.get() - 1) * rowPerPage.get(),
            sort.get(),
            sortOrder.get(),
            filters.get(),
            dataFilters.get(),
            Template.instance().dateFormatMoment
        );
        tableReady.set(sub.ready());

        if (firstLoad.get() && sub.ready()) {
            firstLoad.set(false);
        }

        var $loadingOpacity = $('.meteor-table-table .loading-opacity');
        var $meteorTable = $(".meteor-table-table table");
        $loadingOpacity.height($meteorTable.height());
        $loadingOpacity.width($meteorTable.width());
        $loadingOpacity.width($meteorTable.width());

    });

});

Template.meteorTable.onRendered(function () {
    var columnsSetting = $(".meteor-table .hidden-column-button");
    columnsSetting.popover({
        placement: 'bottom',
        html: true,
        trigger: 'click',
        content: function () {
            return $(".hidden-column-body").html();
        }
    });

    var instance = Template.instance();

    columnsSetting.on('inserted.bs.popover', function () {
        var listColumns = $(".meteor-table .list-columns");
        listColumns.sortable({
            out: function (event, ui) {
                var columnNames = listColumns.sortable("toArray", {attribute: "data-column-name"});
                updateDbData("columnOrder", columnNames, instance);
            }
        });
        listColumns.disableSelection();
        _.each(instance.shownColumns.get(), function (columnName) {
            var listColumnItem = $(".meteor-table .list-columns input[data-column-name='" + columnName + "']");
            listColumnItem.prop("checked", true);
        });
    });
    $('body').on('click', function (e) {
        $('[data-toggle="popover"]').each(function () {
            if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                $(this).popover('hide');
            }
        });
    });
    $('.meteor-table select').select2({
        width: "100%"
    });
    $('.meteor-table .input-daterange').datepicker({
        format: Template.instance().dateFormat,
        language: "ru",
        weekStart: 1,
        autoclose: true,
        todayHighlight: true,
        calendarWeeks: true
    });
});

Template.meteorTable.events({
    'click .pagination a': function (event) {
        if (Template.instance().tableReady.get()) {
            var loadPage = $(event.currentTarget).attr("data-page");
            Template.instance().page.set(parseInt(loadPage));
            Template.instance().loading.set('page');
        }
    },
    'click .rowPerPage button': function (event) {
        if (Template.instance().tableReady.get()) {
            var row = $(event.currentTarget).attr("data-row");
            Template.instance().page.set(1);
            Template.instance().rowPerPage.set(parseInt(row));
            Template.instance().loading.set('rowPerPage');
            updateDbData("rowPerPage", Template.instance().rowPerPage.get());
        }
    },
    'change .popover .list-columns input': function (event, template) {
        var shownColumn = [];
        template.$(".meteor-table .popover .list-columns input:checked").each(function () {
            var column = $(this).attr("data-column-name");
            shownColumn.push(column);
        });
        updateDbData("shownColumns", shownColumn);
    },
    'click .meteor-table-table th': function (event) {
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

    },
    'click .mobile-sort .change-sort-order': function () {
        var currentSortOrder = Template.instance().sortOrder.get();
        var sortOrder = currentSortOrder == "asc" ? "desc" : "asc";
        Template.instance().sortOrder.set(sortOrder);
        Template.instance().loading.set('sort');
        updateDbData("sortOrder", sortOrder);
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
        }
    },
    'click .meteor-table-filters .meteor-table-submit': function (e) {
        e.preventDefault();
        var $form = $(".meteor-table .meteor-table-filters");
        var dataFilters = $form.serializeObject();
        Template.instance().dataFilters.set(dataFilters);
        Template.instance().loading.set('search');
        Template.instance().page.set(1);
        updateDbData("dataFilters", dataFilters);
    },
    'click .excel-download': function (event) {
        var subscribe = Template.instance().data.settings.subscribe;
        var fields = {};
        _.each(Template.instance().fields.get(), function (field, key) {
            if (_.isFunction(field.title)) {
                field.title = field.title();
            }
            fields[key] = field;
        });
        Meteor.call(
            'meteorTableDownloadExcelFile',
            fields,
            Template.instance().columnOrder.get(),
            Template.instance().shownColumns.get(),
            Template.instance().rowPerPage.get(),
            (Template.instance().page.get() - 1) * Template.instance().rowPerPage.get(),
            Template.instance().sort.get(),
            Template.instance().sortOrder.get(),
            Template.instance().filters.get(),
            Template.instance().dataFilters.get(),
            Template.instance().dateFormatMoment,
            function (err, fileUrl) {
                var link = document.createElement("a");
                link.download = subscribe + '.xlsx';
                if (BrowserDetect.browser != "Safari") {
                    link.target = '_blank';
                }
                link.href = fileUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    }
});
