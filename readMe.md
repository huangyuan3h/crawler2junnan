安装插件：

安装 nvm

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
```

安装 node 18

```
nvm install 18

```

安装所有依赖

```
npm install

```

复制 excel 到这个文件夹，并且保证网络是全局模式（所有网络请求都会走 proxy）

```
node index.js
```
