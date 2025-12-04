import { connect } from 'cloudflare:sockets';

// 入口脚本 - 从GitHub下载主代码到KV，然后执行
export default {
    async fetch(request, env, ctx) {
        try {
            // 初始化KV存储
            const kvStore = env.C;
            if (!kvStore) {
                return new Response('KV store not found', { status: 500 });
            }
            
            // 主代码的GitHub URL
            const mainCodeUrl = 'https://raw.githubusercontent.com/byJoey/test/refs/heads/main/223333.js';
            
            // 从KV中加载主代码
            let mainCode = await kvStore.get('mainCode');
            
            // 如果KV中没有主代码，从GitHub下载并存储到KV
            if (!mainCode) {
                const response = await fetch(mainCodeUrl);
                if (!response.ok) {
                    return new Response('Failed to download main code from GitHub', { status: 500 });
                }
                
                mainCode = await response.text();
                
                // 存储到KV，不设置过期时间
                await kvStore.put('mainCode', mainCode);
            }
            
            // 创建一个执行上下文
            const executionContext = {
                request,
                env,
                ctx,
                connect,
                atob,
                btoa,
                fetch: globalThis.fetch,
                setTimeout: globalThis.setTimeout,
                clearTimeout: globalThis.clearTimeout,
                setInterval: globalThis.setInterval,
                clearInterval: globalThis.clearInterval,
                URL: globalThis.URL,
                AbortController: globalThis.AbortController
            };
            
            // 定义执行主代码的函数
            const executeMainCode = new Function('context', `
                // 从上下文获取所需的全局变量
                const { request, env, ctx, connect, atob, btoa, fetch, setTimeout, clearTimeout, setInterval, clearInterval, URL, AbortController } = context;
                
                // 主代码开始
                ${mainCode}
                // 主代码结束
                
                // 执行默认导出的fetch函数
                return default.fetch(request, env, ctx);
            `);
            
            // 执行主代码并返回结果
            return await executeMainCode(executionContext);
        } catch (error) {
            return new Response('Error: ' + error.message, { status: 500 });
        }
    }
};
