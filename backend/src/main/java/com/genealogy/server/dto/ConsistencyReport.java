package com.genealogy.server.dto;

import java.util.ArrayList;
import java.util.List;

public class ConsistencyReport {

    public static class Issue {
        public String type;
        public String personId;
        public String personName;
        public String detail;

        public Issue(String type, String personId, String personName, String detail) {
            this.type = type;
            this.personId = personId;
            this.personName = personName;
            this.detail = detail;
        }
    }

    private int totalIssues;
    private List<Issue> issues = new ArrayList<>();

    public int getTotalIssues() { return totalIssues; }
    public void setTotalIssues(int totalIssues) { this.totalIssues = totalIssues; }
    public List<Issue> getIssues() { return issues; }
    public void setIssues(List<Issue> issues) { this.issues = issues; }

    public void addIssue(String type, String personId, String personName, String detail) {
        issues.add(new Issue(type, personId, personName, detail));
    }
}
