import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { slugify } from "../../shared/cms.ts";

function aboutContent(name) {
  return `<h2>Sobre o ${name}</h2><p>O ${name} é um site dedicado a oferecer conteúdo de qualidade, atualizado e relevante para nossos leitores. Nossa missão é informar, educar e entreter, trazendo artigos cuidadosamente produzidos em cada categoria.</p><p>Acreditamos que a informação acessível e bem escrita pode fazer a diferença. Por isso, nossa equipe trabalha para publicar conteúdos confiáveis e úteis.</p><h3>Nosso compromisso</h3><ul><li>Conteúdo original e de qualidade</li><li>Informação atualizada e verificada</li><li>Experiência de leitura rápida e agradável</li></ul>`;
}

function contactContent(name) {
  return `<h2>Contato</h2><p>Quer falar com o ${name}? Estamos à disposição para responder dúvidas, receber sugestões e parcerias.</p><h3>Como nos encontrar</h3><ul><li>E-mail: contato@${slugify(name)}.com</li><li>Redes sociais: confira os links no rodapé do site</li></ul><p>Fique à vontade para nos enviar uma mensagem e responderemos o mais breve possível.</p>`;
}

function privacyContent(name) {
  return `<h2>Política de Privacidade</h2><p>Esta política de privacidade descreve como o ${name} coleta, usa e protege as informações dos visitantes.</p><h3>Informações coletadas</h3><p>Podemos coletar informações fornecidas diretamente por você, como nome e e-mail em formulários de contato, bem como dados de navegação coletados automaticamente (endereço IP, tipo de navegador, páginas visitadas) por meio de cookies e tecnologias similares.</p><h3>Uso das informações</h3><ul><li>Fornecer e melhorar o conteúdo do site</li><li>Responder a mensagens e solicitações</li><li>Analisar o tráfego e o desempenho do site</li><li>Exibir anúncios relevantes</li></ul><h3>Cookies</h3><p>Utilizamos cookies para melhorar sua experiência. Consulte nossa Política de Cookies para mais detalhes.</p><h3>Terceiros</h3><p>Podemos utilizar serviços de terceiros (como Google AdSense e ferramentas de analytics) que também coletam informações de navegação, regidas por suas próprias políticas.</p><h3>Seus direitos</h3><p>Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais entrando em contato.</p><h3>Alterações</h3><p>Esta política pode ser atualizada periodicamente. Recomendamos a revisão ocasional desta página.</p>`;
}

function cookiesContent(name) {
  return `<h2>Política de Cookies</h2><p>O ${name} utiliza cookies para oferecer uma melhor experiência de navegação aos seus visitantes.</p><h3>O que são cookies</h3><p>Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. Eles ajudam a lembrar suas preferências e a entender como o site é utilizado.</p><h3>Tipos de cookies que utilizamos</h3><ul><li><strong>Cookies essenciais:</strong> necessários para o funcionamento básico do site.</li><li><strong>Cookies de desempenho:</strong> coletam informações anônimas sobre como os visitantes usam o site.</li><li><strong>Cookies de publicidade:</strong> usados por terceiros, como o Google AdSense, para exibir anúncios relevantes.</li></ul><h3>Gerenciamento de cookies</h3><p>Você pode controlar e excluir cookies nas configurações do seu navegador. Desativar cookies pode afetar a funcionalidade do site.</p>`;
}

const PAGE_DEFS = [
  { title: "Sobre", slug: "sobre", page_type: "about", content: aboutContent },
  { title: "Contato", slug: "contato", page_type: "contact", content: contactContent },
  { title: "Política de Privacidade", slug: "politica-de-privacidade", page_type: "privacy", content: privacyContent },
  { title: "Política de Cookies", slug: "politica-de-cookies", page_type: "cookies", content: cookiesContent }
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a admins' }, { status: 403 });
    }

    const settings = await base44.entities.SiteSettings.list({ limit: 1 });
    const siteName = settings.items[0]?.site_name || "nosso site";

    const created = [];
    const skipped = [];
    for (let i = 0; i < PAGE_DEFS.length; i++) {
      const def = PAGE_DEFS[i];
      const existing = await base44.entities.Page.filter({ slug: def.slug });
      if (existing.items.length > 0) {
        skipped.push(def.slug);
        continue;
      }
      const rec = await base44.entities.Page.create({
        title: def.title,
        slug: def.slug,
        page_type: def.page_type,
        content: def.content(siteName),
        in_footer_menu: true,
        order: i
      });
      created.push(rec);
    }

    return Response.json({ created: created.length, skipped, total: PAGE_DEFS.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}