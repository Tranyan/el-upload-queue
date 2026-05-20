# Element-plus 组件 ElUpload 多文件上传并发控制

当前 EIUpload 组件在上传大量文件时，会同时发起所有请求，可能导致浏览器连接数超限或服务器压力过大。

- 原理：通过http-request属性，接管上传逻辑。
- 注：包内保留源码格式可供参考

## 使用：
```javascript
import { useHttpRequest } from 'el-upload-queue';

const { httpRequest } = useHttpRequest({ concurrency: 3 });
```

```html
<ElUpload :http-request="httpRequest" />

```

