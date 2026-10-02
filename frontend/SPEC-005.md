# SPEC-005 — Cadastro e edição

Limites definidos pelo usuário antes da implementação: título obrigatório com até 60 caracteres; descrição obrigatória com até 1.000 caracteres. Ambos removem espaços nas extremidades antes da validação. A categoria deve existir no catálogo. Contagem usa unidades UTF-16, como string.length e os controles HTML.

Os serviços simulados devem aplicar os mesmos limites; a futura API deverá validá-los novamente. Cadastro atribui dono, código, data e OPEN no serviço. Edição permite apenas título, descrição e categoria de registro próprio OPEN.
