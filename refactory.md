当前工程的设计目标是为:"clash verge rev负责除大陆GEOIP外的所有被proxifier分流过来的流量 , 而cfw负责根据之前duangcloud的分流配置来负责那些应该由clash分流的流量" , 现在需要将其修改为:构建时通过参数来决定构建为哪一种分流责任, 比如:npm run build cvr global-proxy/auto-routing 
