此工程为clash系代理翻墙提供对供应商配置(主要单不限于分流)的modify.

设计方向: 
- clash不接管系统流量而是由Proxifier app控制,cfw根据规则自动分流,cvr负责全局代理(仍跳过chinese geoip)
- 根据需求,为clash-for-windows app生成分流配置js脚本,包括域名/geoip等方式
- 为clash verge rev生成全局代理脚本


[clients](src/clients)clients目录放分别为cfw和cvr的配置脚本


[proxy-providers](src/proxy-providers)为每家不同的机场提供定制化


ps:
