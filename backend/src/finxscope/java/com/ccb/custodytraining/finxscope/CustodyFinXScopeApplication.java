package com.ccb.custodytraining.finxscope;

import com.ccb.custodytraining.model.ModelProperties;
import com.ccb.framework.finxscope.starter.FinAgentScopeStarter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = "com.ccb.custodytraining")
@EnableConfigurationProperties(ModelProperties.class)
@FinAgentScopeStarter
public class CustodyFinXScopeApplication {

    public static void main(String[] args) {
        SpringApplication.run(CustodyFinXScopeApplication.class, args);
    }
}
