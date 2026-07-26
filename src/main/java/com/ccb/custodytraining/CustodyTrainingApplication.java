package com.ccb.custodytraining;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Profile;

import com.ccb.custodytraining.model.ModelProperties;
import com.ccb.custodytraining.knowledge.KnowledgeProperties;

@SpringBootApplication
@EnableConfigurationProperties({ModelProperties.class, KnowledgeProperties.class})
@Profile("!finxscope")
public class CustodyTrainingApplication {

    public static void main(String[] args) {
        SpringApplication.run(CustodyTrainingApplication.class, args);
    }
}
