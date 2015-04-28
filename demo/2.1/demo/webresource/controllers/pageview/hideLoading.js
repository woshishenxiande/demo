﻿/**
 * Created by jp_wang on 2014/11/20.
 */
define([
  'cPageView'
], function(
  PageView
  ) {
  var View = PageView.extend({
    events: {
      'click .js-loading-hide': 'showHideLoading'
    },
    onCreate: function() {
    },
    onShow: function () {
      this.header.set({
        title: 'hideLoading',
        back: true,
        events: {
          returnHandler: function () {
            Lizard.goBack();
          }
        }
      });
      this.header.show();
    },
    onHide: function() {

    },
    showHideLoading: function() {
      this.showLoading();
      setTimeout($.proxy(function(){
        this.hideLoading();
      },this),3000);
    }
  });

  return View;
});