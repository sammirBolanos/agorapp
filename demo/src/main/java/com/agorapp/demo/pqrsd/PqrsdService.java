package com.agorapp.demo.pqrsd;

import com.agorapp.demo.pqrsd.dto.CiudadanoDto;
import com.agorapp.demo.pqrsd.dto.PqrsdItemDto;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PqrsdService {

    public List<PqrsdItemDto> listAll() {
        Instant now = Instant.now();
        return List.of(
                new PqrsdItemDto(
                        "PQR-001",
                        "Solicitud de información sobre trámite de licencia de funcionamiento en comuna 10.",
                        "Información",
                        now.minus(8, ChronoUnit.DAYS),
                        new CiudadanoDto(
                                "María Fernanda López",
                                "CC 43.521.901",
                                "m.lopez@correo.com",
                                "+57 300 555 1200"
                        ),
                        "Secretaría de Desarrollo Económico",
                        List.of(
                                "La ciudadana solicita plazos y requisitos actualizados para licencia de funcionamiento.",
                                "Menciona un local en Laureles y actividad de servicios gastronómicos.",
                                "Pide orientación sobre inspección sanitaria y documentos en línea."
                        ),
                        """
                                Estimada María Fernanda,

                                De acuerdo con su petición, le informamos que el trámite de licencia de funcionamiento puede iniciarse a través del portal de trámites de la Alcaldía de Medellín. Los requisitos generales incluyen certificado de uso del suelo, RUT actualizado y cumplimiento de normativa sectorial.

                                Para su caso específico en Laureles, le sugerimos agendar una orientación con la línea de atención de Desarrollo Económico.

                                Cordial saludo,
                                Equipo de Atención PQRSD""",
                        7
                ),
                new PqrsdItemDto(
                        "PQR-002",
                        "Queja por demora en respuesta a solicitud de subsidio a mipymes.",
                        "Quejas",
                        now.minus(5, ChronoUnit.DAYS),
                        new CiudadanoDto(
                                "Carlos Andrés Vélez",
                                "CC 71.902.334",
                                "cavelez@empresa.co",
                                "+57 604 444 8899"
                        ),
                        "Agencia de Cooperación e Inversión de Medellín (ACI)",
                        List.of(
                                "El peticionario indica que lleva más de 20 días sin respuesta formal.",
                                "Adjunta radicado y comprobante de envío de soportes.",
                                "Solicita estado del trámite y fecha estimada de respuesta."
                        ),
                        """
                                Apreciado Carlos Andrés,

                                Hemos registrado su queja y verificaremos el estado del radicado en el sistema de gestión. En un plazo máximo de cinco (5) días hábiles le remitiremos el avance correspondiente y, de ser necesario, las acciones correctivas aplicables.

                                Agradecemos la información suministrada.

                                Atentamente,
                                Equipo de Atención PQRSD""",
                        7
                ),
                new PqrsdItemDto(
                        "PQR-003",
                        "Consulta sobre convocatoria de innovación abierta y criterios de elegibilidad.",
                        "Consultas",
                        now.minus(28, ChronoUnit.DAYS),
                        new CiudadanoDto(
                                "Laura Catalina Mejía",
                                "CC 1.045.882.001",
                                "lmejia.innova@gmail.com",
                                "+57 311 222 6677"
                        ),
                        "Secretaría de Innovación Digital",
                        List.of(
                                "Interés en participar con una startup de software civic tech.",
                                "Pregunta por requisitos de constitución y antigüedad mínima.",
                                "Consulta si aplica para equipos interdisciplinarios."
                        ),
                        """
                                Estimada Laura Catalina,

                                Le confirmamos que la convocatoria vigente publica los criterios de elegibilidad en el anexo técnico. En líneas generales, se requiere personería jurídica o natural con RUT y cumplimiento de requisitos de experiencia indicados por línea estratégica.

                                Puede remitir dudas puntuales sobre su caso y adjuntar una breve ficha del equipo.

                                Saludos cordiales,
                                Equipo de Atención PQRSD""",
                        7
                ),
                new PqrsdItemDto(
                        "PQR-004",
                        "Información sobre horarios y sede para radicación presencial de PQRSD.",
                        "Información",
                        now.minus(1, ChronoUnit.DAYS),
                        new CiudadanoDto(
                                "Diego León Arango",
                                "CC 98.765.432",
                                "d.leon@outlook.com",
                                "+57 300 888 4411"
                        ),
                        "Secretaría de Despacho",
                        List.of(
                                "Consulta por ventanilla única y documentación mínima para radicar.",
                                "Pregunta si requiere cita previa.",
                                "Solicita confirmación de canales digitales alternativos."
                        ),
                        """
                                Apreciado Diego,

                                La radicación de PQRSD está disponible de manera digital las 24 horas. Para atención presencial, puede consultar el calendario y sedes habilitadas en la página institucional; algunos servicios requieren agendamiento.

                                Quedamos atentos a cualquier inquietud adicional.

                                Cordial saludo,
                                Equipo de Atención PQRSD""",
                        7
                ),
                new PqrsdItemDto(
                        "PQR-005",
                        "Queja por inconsistencia en respuesta a reclamo previo sobre facturación de servicio.",
                        "Quejas",
                        now.minus(12, ChronoUnit.DAYS),
                        new CiudadanoDto(
                                "Ana Patricia Gómez",
                                "CC 35.198.765",
                                "ana.gomez@correo.net",
                                "+57 604 321 9900"
                        ),
                        "Contraloría Delegada",
                        List.of(
                                "La peticionaria señala contradicción entre dos comunicaciones oficiales.",
                                "Solicita revisión por parte de un supervisor.",
                                "Adjunta historial de mensajes y radicados."
                        ),
                        """
                                Estimada Ana Patricia,

                                Hemos recibido su queja y activaremos la revisión interna correspondiente. Le informaremos el número de seguimiento y los pasos siguientes dentro del término legal aplicable.

                                Gracias por ayudarnos a mejorar el servicio.

                                Atentamente,
                                Equipo de Atención PQRSD""",
                        7
                )
        );
    }
}
