-- Corrigir categoria 'investimentos' para 'investimento' (que existe no educational_content)
UPDATE unlock_requirements 
SET required_educational_category = 'investimento'
WHERE required_educational_category = 'investimentos';

-- Corrigir categoria 'poupanca' para 'economia' (categoria mais próxima disponível)
UPDATE unlock_requirements 
SET required_educational_category = 'economia'
WHERE required_educational_category = 'poupanca';

-- Ajustar requisitos de contagem para níveis realistas baseado no conteúdo existente
-- chat: de 2 artigos para 1
UPDATE unlock_requirements
SET required_educational_count = 1
WHERE menu_item_key = 'chat' AND required_educational_count = 2;

-- simulator: de 3 artigos para 1
UPDATE unlock_requirements
SET required_educational_count = 1
WHERE menu_item_key = 'simulator' AND required_educational_count = 3;

-- import-transactions: de 3 artigos para 2
UPDATE unlock_requirements
SET required_educational_count = 2
WHERE menu_item_key = 'import-transactions' AND required_educational_count = 3;