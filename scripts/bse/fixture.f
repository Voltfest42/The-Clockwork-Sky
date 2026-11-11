***
      PROGRAM fixture
c-------------------------------------------------------------c
c
c     Test fixtures for The Clockwork Sky's port of BSE.
c
c     Reads lines of
c
c       m1 m2 tb ecc z tphysf sigma seed
c
c     (masses in Msun, the period in days, the end time in Myr,
c     the kick dispersion in km/s and the random seed) and, for
c     each, evolves one binary from the ZAMS with Hurley's own
c     EVOLV2 and the switches of binary.in as distributed,
c     printing every step at full precision:
c
c       S bcm(j,1..32)
c
c     (time, then for each star its type, initial mass, mass,
c     log L, log R, log Teff, core mass, core radius, envelope
c     mass and depth, epoch, spin, mass-loss rate and R/RL, then
c     the period, separation and eccentricity), followed by the
c     event log:
c
c       P bpp(j,1..10)
c
c     (time, both masses, both types, separation, eccentricity,
c     both R/RL and the event's label), and a line "E" at the end
c     of the binary. Only the output is new; BSE itself is
c     unchanged, except that BCM, BPP, SCM and SPP are stored as
c     REAL*8, so that nothing is rounded to single precision on the
c     way out, and BCM has room for 200,000 steps
c     (build-fixtures.ts patches that).
c
c-------------------------------------------------------------c
      implicit none
*
      INCLUDE 'const_bse.h'
*
      integer kstar(2),j,k,ios,seed
      real*8 mass0(2),mass(2),z,zpars(20)
      real*8 epoch(2),tms(2),tphys,tphysf,dtp
      real*8 rad(2),lum(2),ospin(2)
      real*8 massc(2),radc(2),menv(2),renv(2)
      real*8 tb,ecc,m1,m2,sig
*
* The switches of binary.in as distributed.
*
      neta = 0.5d0
      bwind = 0.d0
      hewind = 1.d0
      alpha1 = 3.d0
      lambda = 0.5d0
      ceflag = 0
      tflag = 1
      ifflag = 0
      wdflag = 1
      bhflag = 0
      nsflag = 1
      mxns = 3.d0
      pts1 = 0.05d0
      pts2 = 0.01d0
      pts3 = 0.02d0
      beta = 0.125d0
      xi = 1.d0
      acc2 = 1.5d0
      epsnov = 0.001d0
      eddfac = 10.d0
      gamma = -1.d0
*
      CALL instar
*
 10   READ(*,*,iostat=ios)m1,m2,tb,ecc,z,tphysf,sig,seed
      if(ios.ne.0) goto 99
      sigma = sig
      idum = -ABS(seed)
      CALL zcnsts(z,zpars)
      do 15 , k = 1,2
         kstar(k) = 1
         epoch(k) = 0.d0
         ospin(k) = 0.d0
 15   continue
      mass0(1) = m1
      mass0(2) = m2
      mass(1) = m1
      mass(2) = m2
      tphys = 0.d0
      dtp = 0.d0
      CALL evolv2(kstar,mass0,mass,rad,lum,massc,radc,
     &            menv,renv,ospin,epoch,tms,
     &            tphys,tphysf,dtp,z,zpars,tb,ecc)
      j = 0
 20   j = j + 1
      if(bcm(j,1).ge.0.d0)then
         WRITE(*,100)(bcm(j,k),k=1,32)
         goto 20
      endif
      j = 0
 30   j = j + 1
      if(bpp(j,1).ge.0.d0)then
         WRITE(*,101)(bpp(j,k),k=1,10)
         goto 30
      endif
      WRITE(*,'(a)')'E'
      goto 10
 99   continue
 100  FORMAT('S',1p,32e24.16)
 101  FORMAT('P',1p,10e24.16)
      STOP
      END
