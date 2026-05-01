package com.genealogy.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GenealogyServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(GenealogyServerApplication.class, args);
	}

}
