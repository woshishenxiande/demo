var fs = require('file-system');
var replace = require('../../vendor/replace');
var uglifyUtil = require('../../vendor/uglify-util');
var path = require('path');
var uglifyJs = require('uglify-js');
var htmlMinify = require('html-minifier').minify;

module.exports = function(grunt, config, webappPath) {
  var isDebug = grunt.option('debug');
  
  function filterNotSafe(html) {
    html = html.replace(
      /@using\s*System\.Configuration[^;]/,
      '@using System\.Configuration;'
    );

    // 删除.net注释 @* *@ 
    html = html.replace(/@\*[\s\S]*?\*@/g, '');

    // 服务器模板
    html = html.replace(
      /@\w+[\.\w\[\]\-\(]*".*?"/g,
      function(match) {
        return uglifyUtil.htmlEscape(match);
      }
    );

    // @{ }代码
    html = html.replace(
      /@\{[^\}]+\}/g,
      function(match) {
        return uglifyUtil.htmlEscape(match);
      }
    );

    // underscore模板
    html = html.replace(
      /<%([\s\S]+?)%>/g,
      function(match, $1) {
        return uglifyUtil.htmlEscape('<%') + uglifyUtil.htmlEscape(uglifyUtil.trimUnderscore($1)) + uglifyUtil.htmlEscape('%>');
      }
    );

    // 标签里面的加属性
    html = html.replace(
      /<\w("[^"]*"|'[^']*'|[^>'"])+>/g, 
      function(tag) {

        // 引号内的underscore和引号外的
        tag = tag.replace(
          /=\s*("[^"]*"|'[^']*')/g,
          function(match, $1) {
            $1 = $1.replace(/^'/, '"').replace(/'$/, '"');
            $1 = $1.replace(/%3C%/g, '%33CC%').replace(/%%3E/g, '%%33EE');

            return '=' + $1 + '';
          }
        ).replace(
          /%3C%[\s\S]+?%%3E/g,
          function(match) {
            return '_="' + match + '"';
          }
        );

        return tag;
      }
    );

    // style标签处理
    html = html.replace(
      /<style[^>]*>[\s\S]*?<\/style>/g,
      function(match) {
        return uglifyUtil.htmlEscape(match);
      }
    );

    return html;
  }

  function rollback(html, filepath) {
    // 回滚服务器代码
    html = html.replace(
      /@\w+[\.\w\[\]\-\(]*%22.*?%22/g,
      function(match) {
        return uglifyUtil.htmlUnescape(match);
      }
    );

    // @{ }代码
    html = html.replace(
      /@\{[^\}]+\}/g,
      function(match) {
        return uglifyUtil.htmlUnescape(match);
      }
    );

    html = html.replace(
      /_="(%3C%[\s\S]+?%%3E)"\s*/g,
      function(match, $1) {
        return uglifyUtil.htmlUnescape($1);
      }
    );

    html = html.replace(
      /%3C%[\s\S]+?%%3E/g,
      function(match) {
        return uglifyUtil.htmlUnescape(match);
      }
    );

    html = html.replace(
      /%33CC%([\s\S]+?)%%33EE/g,
      function(match, $1) {
        return '<%' + uglifyUtil.htmlUnescape($1) +'%>';
      }
    );

    // 回滚style
    html = html.replace(
      /%3Cstyle.*?%3E[\s\S]*?%3C\/style%3E/g,
      function(match) {
        match = uglifyUtil.htmlUnescape(match);
        match = htmlMinify(match, {
          minifyCSS: true,
          removeStyleLinkTypeAttributes: true
        });

        return match;
      }
    );

    // 加版本号
    html = html.replace(
      /[\w-\/\.]+\.(css|png|jpg|gif)['"]/g,
      function(match) {
        var framework = [
          'lizard.seed.js',
          'pic.c-ctrip.com/h5',
          'styles/h5/common/main.css',
          'lizard.hybrid.js'
        ];
        var isFind = false;
        framework.forEach(function(item) {
          if (match.indexOf(item) != -1) {
            isFind = true;
          }
        });

        if (isFind) return match;

        return match.replace(/\.(css|png|jpg|gif)/, function($1, $2) {
          return $1 + '?v=' + grunt.config('version');
        });
      }
    );
    // 首页配置版本号
    if (isShared(filepath)) {
      var lizardconfig = false;
      html = html.replace(
        /lizardconfig\s*="([^"]+)"/i,
        function(match, $1) {
          lizardconfig = true;
          if ($1.indexOf('version') !== -1) {
            return match.replace(/version\s*:[^,"]+/, 'version:\'' + grunt.config('version') + "'");
          } else {
            return match.replace(/"$/, ',version:\'' + grunt.config('version') + '\'"');
          }
        }
      );

      if (!lizardconfig) {
        html = html.replace(
          /pdconfig\s*=".+?\.js"/i,
          function(match) {
            return match + ' lizardconfig="version:\'' + grunt.config('version') + "'\"";
          }
        );
      }
    }

    if (!isDebug) {
      html = html.replace(
        /<script\s+type=\"text\/lizard-config\">[\w\W]+?<\/script>/,
        function(match) {
          var reg = /<script\s+type=\"text\/lizard-config\">([\w\W]+)<\/script>/;
          var js = 'var obj=' + match.replace(reg, function($1, $2) {
            return $2.trim();
          });
          var result;

          try {
            result = uglifyJs.minify(js, {
              fromString: true
            });
          } catch (e) {
            grunt.fail.fatal(filepath + ' 压缩text/lizard-config出错:\n' + e);
          }
         
          result = '<script type="text/lizard-config">' +
                   result.code.substr(8)
                    .replace(/;$/, '')
                    // 解决lizard.D bug
                    .replace(/Lizard.D\((.*?)\)/g, function($1, $2) {
                      return 'Lizard.D(' + $2 +') ';
                    }) +
                 '</script>';

          return result;
        }
      );
    }

    return html;
  }

  function isShared(filepath) {
    var paths = filepath.split(path.sep);
    var flag = false;

    paths.forEach(function(item) {
      if (item.toLowerCase() == 'shared') {
        flag = true;
      }
    });

    return flag;
  }

  function uglifyCshtml(html, filepath) {
    html = filterNotSafe(html);
    grunt.log.writeln('Running htmlmin ' + filepath);

    if (!isDebug) {
      try {
        html = htmlMinify(html, {
          removeComments: true,
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeComments: true,
          removeRedundantAttributes: false,
          removeOptionalTags: false,
          minifyJS: isShared(filepath),
          processScripts: ['text/lizard-template'],
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        });
      } catch(e) {
        grunt.fail.fatal(filepath + ' htmlmin出错:\n' + e);
      }
    }
    html = rollback(html, filepath);
    return html;
  }

   // 框架替换
  config.replace.web = config.replace.web.concat([
    {
      filter: ['views/**/*.{cshtml,html}'],
      replace: [
        {
          // 路径dest替换
          match: new RegExp('\/' + config.channel + '\/' + config.webresourceSrc, 'ig'),
          replacement: function(match) {
            var src = config.webresourceSrc;
            return match.replace(src, 'dest/' + src);
          }
        }
      ]
    },
    {
      filter: ['views/_viewstart.cshtml'],
      replace: [
        {
          // viewstart
          match: /(layout[\s\S]*?)views\//i,
          replacement: '$1dest/views/'
        }
      ]
    },
    {
      filter: ['views/shared/_layout.cshtml'],
      replace: [
        {
          // 增加requirejs debug模式
          match: '</head>',
          replacement: function(match) {
            if (isDebug || grunt.option('weinre')) {
              var ip = config.host.split(':');

              return '<script src="http://svn.ui.sh.ctripcorp.com:8899/target/target-script-min.js#'+ ip[0] +'"></script>' + match;
            }
            return match;
          }
        }
      ]
    }
  ]);

  config.replace.web.forEach(function(item) {
    item.filterFn = fs.fileMatch(item.filter, true)
  });

  // 复制并压缩模板 
  fs.copySync(
    path.join(webappPath, 'views'),
    path.join(webappPath, 'dest/views'), {
      process: function(contents, filepath, relative) {
        if (/web\.config$/i.test(filepath)) return contents;
        if (/\.(cshtml|html)$/.test(filepath)) {
          contents = uglifyCshtml(contents, filepath);
        }

        contents = replace(contents, path.join('views', relative), config.replace.web);
        // 乱码
        contents = '\uFEFF' + contents;

        return contents;
      }
    }
  );
}