package com.genealogy.server.service;

import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.util.DateTextParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Component
public class DataValidationService {

    private static final Logger log = LoggerFactory.getLogger(DataValidationService.class);

    public static void validatePersonDates(Map<String, Object> person) {
        String birth = (String) person.get("birth");
        String death = (String) person.get("death");
        if (birth == null || birth.isBlank() || death == null || death.isBlank()) {
            return;
        }
        var birthYear = DateTextParser.extractYear(birth);
        var deathYear = DateTextParser.extractYear(death);
        if (birthYear.isPresent() && deathYear.isPresent()
                && birthYear.get() > deathYear.get()) {
            throw new BadRequestException("出生年份不能晚于去世年份");
        }
    }

    public static void validatePersonLifeStatus(Map<String, Object> person) {
        Boolean deceased = (Boolean) person.get("deceased");
        String death = (String) person.get("death");
        if (Boolean.TRUE.equals(deceased) && (death == null || death.isBlank())) {
            throw new BadRequestException("已故人物必须填写去世日期");
        }
    }

    public static void checkCircularAncestry(Map<String, String> childToParent) {
        for (String childId : childToParent.keySet()) {
            Set<String> visited = new HashSet<>();
            String current = childToParent.get(childId);
            while (current != null && visited.size() < 50) {
                if (!visited.add(current)) {
                    break;
                }
                if (current.equals(childId)) {
                    throw new BadRequestException(
                        "检测到循环祖先引用：人物 " + childId + " 的祖先链中包含自身");
                }
                current = childToParent.get(current);
            }
        }
    }
}
