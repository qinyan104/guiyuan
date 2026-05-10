package com.genealogy.server.service;

import com.genealogy.server.dto.ConsistencyReport;
import com.genealogy.server.util.DateTextParser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ConsistencyService {

    private final JdbcTemplate jdbc;

    public ConsistencyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ConsistencyReport runCheck() {
        ConsistencyReport report = new ConsistencyReport();

        checkOrphanPersons(report);
        checkDateConflicts(report);
        checkLifeStatusConflicts(report);
        checkEmptyFamilies(report);

        report.setTotalIssues(report.getIssues().size());
        return report;
    }

    private void checkOrphanPersons(ConsistencyReport report) {
        String sql = """
            SELECT p.person_id, p.name FROM persons p
            WHERE p.publication_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM family_members fm WHERE fm.person_db_id = p.id
            )
            """;
        jdbc.query(sql, rs -> {
            report.addIssue("orphan", rs.getString("person_id"),
                rs.getString("name"), "该人物不属于任何家庭");
        });
    }

    private void checkDateConflicts(ConsistencyReport report) {
        String sql = "SELECT person_id, name, birth, death FROM persons WHERE birth IS NOT NULL AND death IS NOT NULL";
        jdbc.query(sql, rs -> {
            String personId = rs.getString("person_id");
            String name = rs.getString("name");
            String birth = rs.getString("birth");
            String death = rs.getString("death");
            var by = DateTextParser.extractYear(birth);
            var dy = DateTextParser.extractYear(death);
            if (by.isPresent() && dy.isPresent() && by.get() > dy.get()) {
                report.addIssue("date_conflict", personId, name,
                    "出生年份(" + by.get() + ")晚于去世年份(" + dy.get() + ")");
            }
        });
    }

    private void checkLifeStatusConflicts(ConsistencyReport report) {
        String sql = "SELECT person_id, name, deceased, death FROM persons WHERE deceased = false AND death IS NOT NULL AND death != ''";
        jdbc.query(sql, rs -> {
            report.addIssue("status_conflict", rs.getString("person_id"),
                rs.getString("name"), "标记为在世但有去世日期: " + rs.getString("death"));
        });
    }

    private void checkEmptyFamilies(ConsistencyReport report) {
        String sql = """
            SELECT f.family_id FROM families f
            WHERE NOT EXISTS (
                SELECT 1 FROM family_members fm WHERE fm.family_db_id = f.id
            )
            """;
        jdbc.query(sql, rs -> {
            report.addIssue("empty_family", "", "",
                "空家族: " + rs.getString("family_id"));
        });
    }
}
