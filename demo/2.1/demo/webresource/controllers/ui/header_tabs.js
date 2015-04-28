﻿/**
 * Created by jp_wang on 2014/11/20.
 */
define(['UIDemoView'], function (UIDemoView) {

  var View = UIDemoView.extend({
    events: {
    },
    onCreate: function () {

    },

    _setHeaderTabs: function (index, item) {
      if (!item) item = [
        { id: 'all', name: '全部1243' },
        { id: 'header', name: '收藏' }
      ];

      if (_.isUndefined(index)) {
        index = 0;
      }

      this.headerTabItems = item;
      this.headerTabIndex = index;
    },

    onShow: function () {
      this._setHeaderTabs();
      this._updateHeader();

    },

    _updateHeader: function () {
      this.header.set({
        view: this,
        title: {
          tagname: 'tabs',
          data: {
            items: this.headerTabItems,
            index: this.headerTabIndex
          },
          callback: function (e) {
            var el = $(e.target);
            var index = el.attr('data-index');
            if (index === null) return;

            var data = this.headerTabItems[index];

            this.showToast(data.name);
            this._setHeaderTabs(index);
            this._updateHeader();
          }
        },
        back: true,
        right: [
          {
            tagname: 'map',
            value: '地图',
            callback: function (e) {
              this.showToast('地图');

            }
          }
        ]
      });
    },

    onHide: function() {

    }
  });

  return View;
});