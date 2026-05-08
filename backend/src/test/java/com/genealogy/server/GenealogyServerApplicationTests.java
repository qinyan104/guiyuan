package com.genealogy.server;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("需要 MySQL 数据库连接，在本地 dev 环境中跳过")
class GenealogyServerApplicationTests {

	@Test
	void contextLoads() {
	}

}
