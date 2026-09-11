package com.genealogy.server.auth;

import com.genealogy.server.exception.UnauthorizedException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 从请求上下文中解析当前登录用户。
 *
 * <p>{@code JwtAuthenticationFilter} 校验通过后会把 {@code currentUsername} 写入请求属性，
 * 本组件负责把它（并按请求缓存 {@code cachedUser}）还原成完整的 {@link User}。
 *
 * <p>此前这段逻辑在 8 个 controller 里各复制了一份，而且语义不一致：
 * 有的抛 403、有的抛 500。现在统一为 401（{@link UnauthorizedException}），
 * 这样前端能识别为登录失效并触发续期，而不是显示「服务器内部错误」。
 */
@Component
public class CurrentUserResolver {

    private static final String ATTR_USERNAME = "currentUsername";
    private static final String ATTR_CACHED_USER = "cachedUser";

    private final UserRepository userRepository;

    public CurrentUserResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** 返回当前登录用户；未认证或用户已不存在时抛 401。 */
    public User requireUser(HttpServletRequest request) {
        String username = (String) request.getAttribute(ATTR_USERNAME);
        if (username == null) {
            throw new UnauthorizedException("未登录或登录已过期");
        }

        User cached = (User) request.getAttribute(ATTR_CACHED_USER);
        if (cached != null && username.equals(cached.getUsername())) {
            return cached;
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("登录状态已失效，请重新登录"));
        request.setAttribute(ATTR_CACHED_USER, user);
        return user;
    }

    /** 返回当前登录用户的授权主体（含平台角色）。 */
    public UserSubject requireSubject(HttpServletRequest request) {
        User user = requireUser(request);
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    /** 返回当前登录用户的数据库 ID。 */
    public Long requireUserId(HttpServletRequest request) {
        return requireUser(request).getId();
    }

    /**
     * 当前已认证用户名；未认证返回 null。
     *
     * <p>不查库，供审计日志这类只需要 user 名的场景使用，避免为写一条日志多打一次查询。
     * 需要完整实体或「未登录即失败」语义时用 {@link #requireUser(HttpServletRequest)}。
     */
    public String authenticatedUsername(HttpServletRequest request) {
        return (String) request.getAttribute(ATTR_USERNAME);
    }

    /**
     * 当前登录用户（可选）。用于「有登录身份就用、没有就走匿名分支」的端点，
     * 例如移动端分享码接口：匿名访问是合法路径，所以不能直接抛 401。
     */
    public Optional<User> findCurrentUser(HttpServletRequest request) {
        if (authenticatedUsername(request) == null) {
            return Optional.empty();
        }
        return Optional.of(requireUser(request));
    }
}
