import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
export default defineConfig({
 plugins:[vinext(),cloudflare({configPath:'wrangler.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,persistState:{path:'.wrangler/standalone-state'}})],
 server:{host:'127.0.0.1',port:5173,allowedHosts:['terminal.local']},
});
