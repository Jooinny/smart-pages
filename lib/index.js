const { src, dest, parallel, series, watch } = require("gulp")
const del = require("del")

const browserSync = require("browser-sync")
// 创建一个开发服务器
const bs = browserSync.create()

// 自动加载gulp插件
const loadPlugins = require("gulp-load-plugins")
const plugins = loadPlugins()

// 加载配置
const cwd = process.cwd()
let config = {
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**"
    }
  }
}
try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {}

// 删除文件
const clean = () => {
    return del([config.build.dist, config.build.temp])
}

// 样式编译
const style = () => {
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src }) // base: 保留输出文件的路径，这里src下的路径格式保留，即assets/styles/；cwd：定义从哪个目录开始查找对应的配置文件，即项目目录下${cwd}/${src方法中第一个参数指定的路径}
    .pipe(plugins.sass({ outputStyle: "expanded" })) // output: 指定了样式文件输出的格式，完全展开
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 脚本编译
const script = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 页面模板编译
const page = () => {
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data })) // data:data 模板渲染配置项
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 图片压缩处理
const image = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 文字中的图片文件压缩处理
const fonts = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 额外的文件处理
const extra = () => {
    return src("**", { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, "."] }))
    // 截止到这一步，dist下面处理的文件并未处理，直接又生成到dist目录下（html、js、css）
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
        collapseWhitespace: true, // 折叠所有空白字符，换行等
        minifyCSS: true, // 处理html中的css样式
        minifyJS: true // 处理html中的js内容
    })))
    .pipe(dest(config.build.dist))
    
    // 这部分存在一个问题，往dist目录中一遍执行读操作，一遍执行写操作，是不合理的，需要把处理好的文件先放到一个临时目录中处理
}

// 启动开发服务器
const serve = () => {
    watch(config.build.paths.styles, { cwd: config.build.src }, style)
    watch(config.build.paths.scripts, { cwd: config.build.src }, script)
    watch(config.build.paths.pages, { cwd: config.build.src }, page)
    // 对于图片、字体等一些资源文件，开发时候无做监听处理的必要
    watch([
        config.build.paths.images,
        config.build.paths.fonts,
    ], { cwd: config.build.src }, bs.reload)
    watch("**", { cwd: config.build.public }, bs.reload)

    bs.init({
        notify: false, // 取消网页通知
        port: 7272, // 服务端口，默认3000
        open: true, // 关闭自动打开
        // 对于files配置，也可以在src对应文件发生变化时执行bs.reload重新启动服务（常见，如上）
        // files: "dist/**", // 监听文件配置 
        server: {
            baseDir: [ config.build.temp, config.build.src, config.build.public ], // 网页根目录
            routes: {
                "/node_modules": "node_modules" 
            }
        }
    })
}

/**
 * 编译并行处理
 * style: 样式编译
 * script: 脚本编译
 * page: 页面模板编译
 * image: 图片文件压缩
 * fonts: 字体处理
 */
const compile = parallel(style, script, page)

// 一般编译任务用来处理src目录下的文件，与extra任务分开比较好
// 图片、字体等静态文件，上线时处理好即可，开发阶段无处理必要
const build = series(
    clean, 
    parallel(
        series(
            compile, 
            useref
        ), 
        image, 
        fonts, 
        extra
    )
)

const dev = series(compile, serve)

module.exports = {
    clean,
    compile,
    build,
    dev
}