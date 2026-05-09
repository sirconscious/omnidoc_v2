package com.omnidoc.api.auth;


import com.omnidoc.api.config.JwtService;
import com.omnidoc.api.modles.Role;
import com.omnidoc.api.modles.User;
import com.omnidoc.api.modles.UserRepositrory;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepositrory repositrory;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthenticationResponse register(RegisterRequest registerRquest) {
        var user = User.builder()
                .firstname(registerRquest.getFirstName())
                .lastname(registerRquest.getLastName())
                .email(registerRquest.getEmail())
                .password(passwordEncoder.encode(registerRquest.getPassword()))
                .role(Role.USER)
                .build();
            repositrory.save(user);
            var jwt = jwtService.generateToken(user);
            return  AuthenticationResponse.builder().token(jwt).build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest authenticationRquest) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                        authenticationRquest.getEmail(),
                    authenticationRquest.getPassword()
            )
        );
        var user = repositrory.findByEmail(authenticationRquest.getEmail())
                .orElseThrow();
        var jwt = jwtService.generateToken(user);

        return AuthenticationResponse.builder().token(jwt).build();
    }
}