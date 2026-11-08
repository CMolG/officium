package com.javadaba.apps.local.standins;

import com.javadaba.contexts.officium.domain.ports.PrecedenceTemplateCatalog;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

/** No shared template catalog in Officium Local: precedence rules are written per project. */
@ApplicationScoped
public class LocalPrecedenceTemplates implements PrecedenceTemplateCatalog {

    @Override
    public List<Template> templates() {
        return List.of();
    }
}
