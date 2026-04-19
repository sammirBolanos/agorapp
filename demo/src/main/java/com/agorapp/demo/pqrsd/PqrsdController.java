package com.agorapp.demo.pqrsd;

import com.agorapp.demo.pqrsd.dto.PqrsdItemDto;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pqrsds")
public class PqrsdController {

    private final PqrsdService pqrsdService;

    public PqrsdController(PqrsdService pqrsdService) {
        this.pqrsdService = pqrsdService;
    }

    @GetMapping
    public List<PqrsdItemDto> list() {
        return pqrsdService.listAll();
    }
}
