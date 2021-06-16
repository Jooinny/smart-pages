#!/usr/bin/env node

// Add params of gulp
process.argv.push("--gulpfile")
process.argv.push(require.resolve("..")) // 找到当前上一级目录中package.json的main中对应的文件
process.argv.push("--cwd")
process.argv.push(process.cwd())

require("gulp/bin/gulp")