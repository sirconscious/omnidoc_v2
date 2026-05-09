package com.omnidoc.api.config;


import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final String secretKey = "29aded6d764698e0eecfa8e34ad2ee29e44d4cf547fd54b7a714d8d41577441c" ;


    public  String generateToken(UserDetails userDetails){
        return generateToken(new HashMap<>() , userDetails);
    }

    public String generateToken(Map<String , Object> extraClaims , UserDetails userDetails){
        return  Jwts.builder().setClaims(extraClaims).
                setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000*60*60*24))                    .signWith(getSignInKey() , SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUserEmail(String jwt) {
        return extractClaim(jwt , Claims::getSubject) ;
    }

    public <T> T extractClaim(String token  , Function<Claims , T> claimsTFunction){
        final Claims claims = extractAllClaims(token);
        return claimsTFunction.apply(claims);

    }
    private Claims extractAllClaims(String token){
        return Jwts.parser()
                .setSigningKey(getSignInKey())
                .build().parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
    public boolean isTokenValid(String token , UserDetails userDetails){
        final String useremail = extractUserEmail(token);
        return (useremail.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token , Claims::getExpiration);
    }

}
