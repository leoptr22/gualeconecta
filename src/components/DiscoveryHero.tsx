import { Typography } from '@mui/material';

export function DiscoveryHero({ section }: { section: string }) {
  return <section className="discovery-hero" aria-labelledby="discovery-title">
    <div className="hero-location">Gualeguaychú + alrededores</div>
    <div className="hero-composition">
      <div className="intro">
        <Typography component="h1" id="discovery-title">
          {section === 'Descubrir' ? <><span className="hero-city">GUALE.</span><span className="hero-message">PASAN <em>COSAS.</em></span></> : section === 'Agenda' ? <>SALÍ.<br /><em>HAY PLAN.</em></> : <>COMPRÁ<br /><em>POR ACÁ.</em></>}
        </Typography>
        <Typography className="intro-copy">Promos, encuentros y comercios de nuestra ciudad. Encontrá lo que buscás, cerca tuyo.</Typography>
      </div>
      <div className="local-stamp" aria-hidden="true"><span className="stamp-star">✳</span><strong>DE ACÁ.<br />PARA VOS.</strong></div>
    </div>
    <div className="hero-footnote"><span>La ciudad se mueve.</span><span>Vos elegís el plan. ↙</span></div>
  </section>;
}
