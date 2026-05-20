/**
 * 上传队列配置选项接口
 */
interface QueueOptions {
    /** 最大并发数，默认 3 */
    concurrency?: number;
}

/**
 * 上传队列控制类，支持并发限制及扩展配置
 * @typeParam T - 任务返回结果的类型，默认为 unknown
 */
export class Queue<T = unknown> {
    private concurrency: number;
    private queue: Array<{
        id: number;
        task: () => Promise<T>;
        resolve: (value: T | PromiseLike<T>) => void;
        reject: (reason?: any) => void;
    }>;
    private running: number;

    /**
     * 构造函数，支持传入配置对象
     * @param options 配置对象
     */
    constructor(options?: QueueOptions) {
        const { concurrency = 3 } = options || {};
        this.concurrency = concurrency;
        this.queue = [];
        this.running = 0;
    }

    /**
     * 添加一个上传任务
     * @param task 返回 Promise 的函数，代表上传操作
     * @returns 一个 Promise，其结果与原任务一致
     */
    public add(id: number, task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // 将任务及其 resolve/reject 存入队列
            this.queue.push({ id, task, resolve, reject });
            // 尝试启动下一个任务
            this._next();
        });
    }
    /**
     *
     * @param id
     */
    public remove(id: number) {
        this.queue = this.queue.filter((item) => item.id !== id);
    }

    public clear() {
        this.queue = [];
    }

    /**
     * 内部方法：尝试启动下一个任务
     */
    private _next(): void {
        while (this.running < this.concurrency && this.queue.length) {
            const { task, resolve, reject } = this.queue.shift()!;
            this.running++;
            Promise.resolve()
                .then(() => task())
                .then((result) => resolve(result))
                .catch((error) => reject(error))
                .finally(() => {
                    this.running--;
                    this._next(); // 继续执行下一个任务
                });
        }
    }
}
