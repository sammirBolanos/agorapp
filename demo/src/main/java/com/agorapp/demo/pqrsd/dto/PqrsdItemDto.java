package com.agorapp.demo.pqrsd.dto;

import java.time.Instant;
import java.util.List;

public record PqrsdItemDto(
        String id,
        String tituloIa,
        String tipo,
        Instant createdAt,
        CiudadanoDto ciudadano,
        String dependenciaSugerida,
        List<String> resumenBullets,
        String borradorRespuesta,
        int documentoPaginas
) {
}
